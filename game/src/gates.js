// The seven gates: floating ink drawings you can approach and open.
// Tap one -> camera glides in, drawing blooms, a line of meditation appears.
import * as THREE from 'three';
import { softGlowTex } from './world.js';

const GATES = [
  { img: '../art/drawing-01.jpg', line: 'The light you have been seeking is the light you are.' },
  { img: '../art/drawing-02.jpg', line: 'Be still. The water only mirrors a quiet sky.' },
  { img: '../art/drawing-03.jpg', line: 'Every line you drew was a prayer you did not know you knew.' },
  { img: '../art/drawing-04.jpg', line: 'Faith is the willingness to be lit from within.' },
  { img: '../art/drawing-05.jpg', line: 'The wound and the doorway were always the same shape.' },
  { img: '../art/drawing-06.jpg', line: 'Love does not arrive. It is uncovered.' },
  { img: '../art/drawing-07.jpg', line: 'You are the lake, the sunrise, and the one who watches.' },
];

export function buildGates(scene, camera, audio) {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const group = new THREE.Group();
  const gates = [];
  const R = 42;

  GATES.forEach((g, i) => {
    const a = (i / GATES.length) * Math.PI * 2 + 0.35;
    const holder = new THREE.Group();
    holder.position.set(Math.cos(a) * R, 4.6, Math.sin(a) * R);

    // golden frame
    const frame = new THREE.Mesh(
      new THREE.PlaneGeometry(4.7, 6.4),
      new THREE.MeshBasicMaterial({ color: 0xd8a95e, transparent: true, opacity: 0.85, fog: false })
    );
    frame.position.z = -0.03;
    // the drawing itself
    const tex = loader.load(g.img, t => { t.colorSpace = THREE.SRGBColorSpace; });
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(4.3, 6.0),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false })
    );
    // soft glow behind
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softGlowTex(), color: 0xffd9a0, transparent: true, opacity: 0.34,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    glow.scale.set(11, 13, 1);
    glow.position.z = -0.6;

    holder.add(glow, frame, art);
    holder.userData = {
      art, glow, baseY: holder.position.y, phase: Math.random() * 6.28,
      line: g.line, focused: false, scaleT: 1,
    };
    art.userData.gate = holder;
    group.add(holder);
    gates.push(holder);
  });
  scene.add(group);

  const ray = new THREE.Raycaster();
  let focused = null;
  let camTween = null; // {fromPos, toPos, fromLook, toLook, t, dur, done}
  const captionEl = document.getElementById('caption');
  const captionText = document.getElementById('caption-text');
  const lookPoint = new THREE.Vector3();

  function tweenCam(toPos, toLook, dur, done) {
    camTween = {
      fromPos: camera.position.clone(), toPos: toPos.clone(),
      fromLook: lookPoint.clone(), toLook: toLook.clone(),
      t: 0, dur, done,
    };
  }
  const ease = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

  function focus(holder) {
    if (focused === holder) return;
    unfocus(true);
    focused = holder;
    holder.userData.focused = true;
    const p = holder.position;
    // stand between player-side and the gate, looking at it
    const dir = p.clone().setY(0).normalize();
    const camPos = p.clone().addScaledVector(dir, -11).add(new THREE.Vector3(0, 2.2, 0));
    lookPoint.copy(p);
    tweenCam(camPos, p.clone(), 2.4, null);
    captionText.textContent = '“' + holder.userData.line + '”';
    captionEl.classList.remove('hidden');
    audio.chime();
  }

  function unfocus(silent = false) {
    if (!focused) return;
    focused.userData.focused = false;
    focused = null;
    captionEl.classList.add('hidden');
    if (!silent) { /* camera control returns to player rig */ }
  }
  document.getElementById('caption-close').addEventListener('click', () => unfocus());

  function tap(nx, ny) {
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const hits = ray.intersectObjects(gates.map(g => g.userData.art), false);
    if (hits.length) focus(hits[0].object.userData.gate);
    else if (focused) unfocus();
  }

  return {
    tap,
    get focused() { return focused; },
    driveCamera(player) {
      // returns true when gates own the camera this frame
      if (camTween) {
        camTween.t += 1 / 60;
        const k = ease(Math.min(1, camTween.t / camTween.dur));
        camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
        lookPoint.lerpVectors(camTween.fromLook, camTween.toLook, k);
        camera.lookAt(lookPoint);
        if (k >= 1) { const d = camTween.done; camTween = null; d && d(); }
        return true;
      }
      if (focused) {
        const p = focused.position;
        const dir = p.clone().setY(0).normalize();
        const camPos = p.clone().addScaledVector(dir, -11).add(new THREE.Vector3(0, 2.2, 0));
        camera.position.lerp(camPos, 0.04);
        lookPoint.lerp(p, 0.08);
        camera.lookAt(lookPoint);
        return true;
      }
      return false;
    },
    releaseCamera() { unfocus(); camTween = null; },
    update(t, dt) {
      for (const h of gates) {
        const u = h.userData;
        // face the lake center (and the player)
        h.lookAt(0, u.baseY, 0);
        // gentle bob + breathe
        const targetScale = u.focused ? 1.55 : 1.0;
        u.scaleT += (targetScale - u.scaleT) * Math.min(1, dt * 2.2);
        h.position.y = u.baseY + Math.sin(t * 0.55 + u.phase) * 0.55;
        h.scale.setScalar(u.scaleT * (1 + Math.sin(t * 0.8 + u.phase) * 0.02));
        u.glow.material.opacity = (u.focused ? 0.55 : 0.3) + Math.sin(t * 1.1 + u.phase) * 0.06;
      }
    },
  };
}
