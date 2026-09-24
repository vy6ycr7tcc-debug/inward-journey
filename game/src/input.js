// Unified keyboard + touch input. Exposes:
//   input.move  -> {x, z} in [-1,1], camera-relative intent
//   input.lookDX, input.lookDY -> accumulated drag deltas (consumed per frame)
//   input.onTap -> fn(ndcX, ndcY)  tap/click callback for interaction
export const input = {
  move: { x: 0, z: 0 },
  lookDX: 0, lookDY: 0,
  onTap: null,
  joystickActive: false,
};

const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

function pollKeys() {
  let x = 0, z = 0;
  if (keys['KeyW'] || keys['ArrowUp']) z -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) z += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) x += 1;
  return { x, z };
}

// ---------- touch ----------
const joyEl = document.getElementById('joystick');
const stickEl = document.getElementById('stick');
let joyId = null, joyOX = 0, joyOY = 0, joyVec = { x: 0, z: 0 };
let lookId = null, lookLX = 0, lookLY = 0;
let tapCand = null; // {id, x0, y0, t0, moved}
const TAP_MS = 350, TAP_PX = 14;

function ndc(x, y) {
  return { x: (x / innerWidth) * 2 - 1, y: -(y / innerHeight) * 2 + 1 };
}

addEventListener('touchstart', e => {
  for (const t of e.changedTouches) {
    if (t.clientX < innerWidth * 0.45 && joyId === null) {
      joyId = t.identifier; joyOX = t.clientX; joyOY = t.clientY;
      joyEl.style.left = joyOX + 'px'; joyEl.style.top = joyOY + 'px';
      joyEl.classList.remove('hidden');
      input.joystickActive = true;
    } else if (lookId === null) {
      lookId = t.identifier; lookLX = t.clientX; lookLY = t.clientY;
    }
    tapCand = { id: t.identifier, x0: t.clientX, y0: t.clientY, t0: performance.now(), moved: false };
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) {
      let dx = (t.clientX - joyOX) / 52, dy = (t.clientY - joyOY) / 52;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      joyVec = { x: dx, z: dy };
      stickEl.style.transform = `translate(calc(-50% + ${dx * 34}px), calc(-50% + ${dy * 34}px))`;
    } else if (t.identifier === lookId) {
      input.lookDX += t.clientX - lookLX;
      input.lookDY += t.clientY - lookLY;
      lookLX = t.clientX; lookLY = t.clientY;
    }
    if (tapCand && t.identifier === tapCand.id) {
      if (Math.hypot(t.clientX - tapCand.x0, t.clientY - tapCand.y0) > TAP_PX) tapCand.moved = true;
    }
  }
  if (e.cancelable) e.preventDefault();
}, { passive: false });

function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) {
      joyId = null; joyVec = { x: 0, z: 0 };
      stickEl.style.transform = 'translate(-50%, -50%)';
      joyEl.classList.add('hidden');
      input.joystickActive = false;
    }
    if (t.identifier === lookId) lookId = null;
    if (tapCand && t.identifier === tapCand.id) {
      const dt = performance.now() - tapCand.t0;
      if (!tapCand.moved && dt < TAP_MS && input.onTap) {
        const p = ndc(t.clientX, t.clientY);
        input.onTap(p.x, p.y);
      }
      tapCand = null;
    }
  }
}
addEventListener('touchend', endTouch);
addEventListener('touchcancel', endTouch);

// ---------- mouse ----------
let mDown = false, mLX = 0, mLY = 0, mMoved = 0, mT0 = 0;
addEventListener('mousedown', e => {
  if (e.target.closest('button')) return;
  mDown = true; mLX = e.clientX; mLY = e.clientY; mMoved = 0; mT0 = performance.now();
});
addEventListener('mousemove', e => {
  if (!mDown) return;
  const dx = e.clientX - mLX, dy = e.clientY - mLY;
  mMoved += Math.abs(dx) + Math.abs(dy);
  input.lookDX += dx; input.lookDY += dy;
  mLX = e.clientX; mLY = e.clientY;
});
addEventListener('mouseup', e => {
  if (!mDown) return;
  mDown = false;
  if (mMoved < 8 && performance.now() - mT0 < 400 && input.onTap && !e.target.closest('button')) {
    const p = ndc(e.clientX, e.clientY);
    input.onTap(p.x, p.y);
  }
});

// merge keyboard + joystick each frame
export function updateInput() {
  const k = pollKeys();
  input.move.x = k.x + joyVec.x;
  input.move.z = k.z + joyVec.z;
  const m = Math.hypot(input.move.x, input.move.z);
  if (m > 1) { input.move.x /= m; input.move.z /= m; }
}
export function consumeLook() {
  const dx = input.lookDX, dy = input.lookDY;
  input.lookDX = 0; input.lookDY = 0;
  return { dx, dy };
}
