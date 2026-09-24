// The lake at sunrise — built on three.js's own master shaders:
// Preetham Sky (atmosphere + sun + procedural clouds) and the classic
// reflective Water (after jbouny/ocean). Mist, islands, light-motes.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

// sunrise sun: just above the horizon, dead ahead
const elevation = 2.6, azimuth = 180;
const phi = THREE.MathUtils.degToRad(90 - elevation);
const theta = THREE.MathUtils.degToRad(azimuth);
export const SUN_DIR = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
export const FOG_COLOR = new THREE.Color(0xd9a06a); // warm horizon haze

function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const softGlowTex = () => radialTexture('rgba(255,235,200,1)', 'rgba(255,235,200,0)');
export const mistTex = () => radialTexture('rgba(235,225,210,0.55)', 'rgba(235,225,210,0)');

export function buildWorld(scene) {
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.0032);

  // ---------- sky: Preetham atmosphere + sun disc + drifting clouds ----------
  const sky = new Sky();
  sky.scale.setScalar(4000);
  const su = sky.material.uniforms;
  su['turbidity'].value = 9;
  su['rayleigh'].value = 2.8;
  su['mieCoefficient'].value = 0.008;
  su['mieDirectionalG'].value = 0.85;
  su['sunPosition'].value.copy(SUN_DIR);
  su['cloudScale'].value = 0.00022;
  su['cloudSpeed'].value = 0.000035;
  su['cloudCoverage'].value = 0.38;
  su['cloudDensity'].value = 0.45;
  su['cloudElevation'].value = 0.55;
  scene.add(sky);

  // ---------- water: real reflective ocean shader ----------
  const normals = new THREE.TextureLoader().load('../../art/waternormals.jpg', t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  });
  const water = new Water(new THREE.PlaneGeometry(2200, 2200), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: normals,
    sunDirection: SUN_DIR.clone(),
    sunColor: 0xffa050,
    waterColor: 0x0b2a33,
    distortionScale: 2.6,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);

  // ---------- lights ----------
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
  sun.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9db4d8, 0x1a2a38, 0.9));
  const bounce = new THREE.PointLight(0xffb877, 14, 70, 1.6);
  bounce.position.set(-18, 4, -26);
  scene.add(bounce);

  // ---------- drifting mist ----------
  const mistTexture = mistTex();
  const mistGroup = new THREE.Group();
  const mists = [];
  for (let i = 0; i < 46; i++) {
    const mat = new THREE.SpriteMaterial({
      map: mistTexture, transparent: true, opacity: 0.16, depthWrite: false, fog: false,
    });
    const s = new THREE.Sprite(mat);
    const r = 25 + Math.random() * 160;
    const a = Math.random() * Math.PI * 2;
    s.position.set(Math.cos(a) * r, 1.2 + Math.random() * 4.5, Math.sin(a) * r);
    const sc = 22 + Math.random() * 42;
    s.scale.set(sc, sc * 0.42, 1);
    s.material.opacity = 0.08 + Math.random() * 0.12;
    s.userData = { speed: 0.25 + Math.random() * 0.5, phase: Math.random() * 6.28, baseY: s.position.y };
    mistGroup.add(s); mists.push(s);
  }
  scene.add(mistGroup);

  // ---------- distant island silhouettes, dissolving into haze ----------
  const islMat = new THREE.MeshBasicMaterial({ color: 0x4a3a52, fog: true, transparent: true, opacity: 0.9 });
  const islands = new THREE.Group();
  const islDefs = [
    { x: -260, z: -420, w: 190, h: 34 }, { x: 300, z: -380, w: 150, h: 26 },
    { x: -80, z: -520, w: 260, h: 44 }, { x: 420, z: 180, w: 170, h: 30 },
    { x: -430, z: 140, w: 200, h: 36 },
  ];
  for (const d of islDefs) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(d.w / 2, d.h, 7, 1), islMat);
    m.position.set(d.x, d.h / 2 - 2, d.z);
    m.rotation.y = Math.random() * 3;
    islands.add(m);
  }
  scene.add(islands);

  // ---------- floating dust motes of light ----------
  const moteGeo = new THREE.BufferGeometry();
  const N = 260, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 8 + Math.random() * 120, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = 0.5 + Math.random() * 14;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const moteMat = new THREE.PointsMaterial({
    map: softGlowTex(), size: 1.6, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2b0, sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.userData.base = pos.slice();
  scene.add(motes);

  return {
    update(t, dt) {
      water.material.uniforms['time'].value = t;
      sky.material.uniforms['time'].value = t;
      for (const s of mists) {
        const u = s.userData;
        s.position.x += Math.sin(t * 0.05 + u.phase) * dt * u.speed;
        s.position.z += Math.cos(t * 0.04 + u.phase) * dt * u.speed * 0.7;
        s.position.y = u.baseY + Math.sin(t * 0.18 + u.phase) * 0.8;
      }
      const p = moteGeo.attributes.position.array, b = motes.userData.base;
      for (let i = 0; i < N; i++) {
        p[i * 3] = b[i * 3] + Math.sin(t * 0.12 + i) * 2.2;
        p[i * 3 + 1] = 0.5 + ((b[i * 3 + 1] + t * 0.35) % 15);
        p[i * 3 + 2] = b[i * 3 + 2] + Math.cos(t * 0.1 + i * 1.7) * 2.2;
      }
      moteGeo.attributes.position.needsUpdate = true;
      moteMat.opacity = 0.38 + Math.sin(t * 0.5) * 0.1;
    }
  };
}
