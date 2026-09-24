// Inward Journey — The Lake. Boot, loop, orchestration.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { buildPlayer } from './player.js';
import { buildGates } from './gates.js';
import { buildAudio } from './audio.js';
import { input, updateInput } from './input.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 2000);
camera.position.set(0, 7, 26);

const world = buildWorld(scene);
const audio = buildAudio();
const player = buildPlayer(scene, camera);
const gates = buildGates(scene, camera, audio);
input.onTap = (x, y) => gates.tap(x, y);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- begin ritual ----------
const overlay = document.getElementById('begin-overlay');
const toast = document.getElementById('toast');
let begun = false;
function begin() {
  if (begun) return; begun = true;
  audio.start();
  overlay.classList.add('fade');
  setTimeout(() => overlay.remove(), 2600);
  showToast('walk with the light — touch a drawing to open it', 7000);
  // opening breath: slow push-in
  player.setCameraDriven(true);
  const p0 = camera.position.clone();
  const p1 = new THREE.Vector3(0, 6.4, 17);
  const t0 = performance.now();
  (function pushIn() {
    const k = Math.min(1, (performance.now() - t0) / 4200);
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(p0, p1, e);
    camera.lookAt(player.pos.x, 2.2, player.pos.z);
    if (k < 1 && begun) requestAnimationFrame(pushIn);
    else player.setCameraDriven(false);
  })();
}
document.getElementById('begin-btn').addEventListener('click', e => { e.stopPropagation(); begin(); });
overlay.addEventListener('click', begin);
// QA hook: ?autostart=1 begins without a gesture (silent audio)
if (new URLSearchParams(location.search).get('autostart') === '1') {
  setTimeout(begin, 800);
}

let toastTimer = null;
function showToast(msg, ms = 5000) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), ms);
}

// first-time hint: drift toward a gate
let hintShown = false;

// ---------- main loop ----------
const clock = new THREE.Clock();
let elapsed = 0;

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  updateInput();

  const camDrivenByGates = gates.driveCamera(player);
  player.setCameraDriven(camDrivenByGates);
  player.update(elapsed, dt);
  gates.update(elapsed, dt);
  world.update(elapsed, dt, camera.position);

  if (begun && !hintShown && elapsed > 26) {
    hintShown = true;
    showToast('the drawings are doors — touch one', 6000);
  }

  renderer.render(scene, camera);
}
frame();
