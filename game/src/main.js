// Inward Journey — The Lake. Boot, loop, orchestration.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
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

// ---------- cinematic post-processing ----------
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.65, 0.78);
composer.addPass(bloom);
// final grade: vignette + living grain + warm lift, applied in HDR before OutputPass
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float vig = smoothstep(0.95, 0.35, length(d) * 1.35);
      c.rgb *= mix(0.72, 1.0, vig);
      float g = hash(vUv * (1024.0 + 256.0 * sin(uTime * 0.7))) - 0.5;
      c.rgb += g * 0.028 * (0.4 + 0.6 * (1.0 - vig));
      c.rgb += vec3(0.012, 0.006, 0.002);
      gl_FragColor = c;
    }`,
};
const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);
composer.addPass(new OutputPass());

const world = buildWorld(scene);
const audio = buildAudio();
const player = buildPlayer(scene, camera);
const gates = buildGates(scene, camera, audio);
input.onTap = (x, y) => gates.tap(x, y);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
});

// ---------- begin ritual ----------
const overlay = document.getElementById('begin-overlay');
const toast = document.getElementById('toast');
let begun = false;
let introActive = false;
function begin() {
  if (begun) return; begun = true;
  audio.start();
  overlay.classList.add('fade');
  setTimeout(() => overlay.remove(), 2600);
  showToast('walk with the light — touch a drawing to open it', 7000);
  // opening breath: slow GSAP push-in
  introActive = true;
  gsap.to(camera.position, {
    x: 0, y: 6.4, z: 17, duration: 4.5, ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(player.pos.x, 2.2, player.pos.z),
    onComplete: () => { introActive = false; },
  });
  gates.entrance();
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

  const camDrivenByGates = gates.driveCamera();
  player.setCameraDriven(introActive || camDrivenByGates);
  player.update(elapsed, dt);
  gates.update(elapsed, dt);
  world.update(elapsed, dt, camera.position);

  if (begun && !hintShown && elapsed > 26) {
    hintShown = true;
    showToast('the drawings are doors — touch one', 6000);
  }

  gradePass.uniforms.uTime.value = elapsed;
  composer.render();
}
frame();
