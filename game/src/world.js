// The lake at sunrise: sky dome, shader water, mist, sun, ambient life.
import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.28, -0.79).normalize();
export const FOG_COLOR = new THREE.Color(0xd9a06a); // warm horizon haze
const FOG_DENSITY = 0.0038;

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
  scene.fog = null; // custom fog in shaders; keep three fog off

  // ---------- sky dome ----------
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uSunDir: { value: SUN_DIR },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uSunDir; uniform float uTime;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.08, 1.0);
        // vertical gradient: rose-gold horizon -> soft violet-blue zenith
        vec3 horizon = vec3(1.00, 0.62, 0.38);
        vec3 mid     = vec3(0.62, 0.52, 0.62);
        vec3 zenith  = vec3(0.23, 0.30, 0.48);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.28, h));
        col = mix(col, zenith, smoothstep(0.22, 0.85, h));
        // warm glow around the sun
        float s = max(dot(d, uSunDir), 0.0);
        col += vec3(1.0, 0.55, 0.25) * pow(s, 6.0) * 0.55;
        col += vec3(1.0, 0.80, 0.55) * pow(s, 60.0) * 0.9;
        // sun disc
        float disc = smoothstep(0.9996, 0.99985, s);
        col += vec3(1.0, 0.92, 0.78) * disc * 2.2;
        // faint high clouds bands
        float cl = sin(d.x * 9.0 + uTime * 0.02) * sin(d.z * 7.0 - uTime * 0.015);
        cl = smoothstep(0.55, 0.95, cl) * smoothstep(0.05, 0.3, h) * (1.0 - smoothstep(0.35, 0.7, h));
        col += vec3(1.0, 0.75, 0.6) * cl * 0.12;
        // below horizon: deep water-dark
        col = mix(vec3(0.10, 0.16, 0.22), col, smoothstep(-0.08, 0.005, d.y));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), skyMat);
  scene.add(sky);

  // ---------- water ----------
  const waterMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIR },
      uCamPos: { value: new THREE.Vector3() },
      uFogColor: { value: FOG_COLOR },
      uFogDensity: { value: FOG_DENSITY },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorld; varying float vElev;
      void main() {
        vec3 p = position;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        float t = uTime;
        float w = 0.0;
        w += sin(wp.x * 0.055 + t * 0.9) * 0.55;
        w += sin(wp.z * 0.073 - t * 0.7) * 0.42;
        w += sin((wp.x + wp.z) * 0.021 + t * 0.45) * 0.8;
        w += sin(wp.x * 0.35 + wp.z * 0.31 + t * 1.7) * 0.06;
        wp.y += w * 0.35;
        vElev = w;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uSunDir; uniform vec3 uCamPos;
      uniform vec3 uFogColor; uniform float uFogDensity;
      varying vec3 vWorld; varying float vElev;
      void main() {
        vec3 V = normalize(uCamPos - vWorld);
        // geometric normal from screen-space derivatives (glassy look)
        vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        if (n.y < 0.0) n = -n;
        float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
        vec3 deep = vec3(0.05, 0.13, 0.19);
        vec3 lift = vec3(0.35, 0.42, 0.48);
        vec3 col = mix(deep, lift, fres * 0.85 + vElev * 0.06 + 0.08);
        // sky reflection tint near horizon
        col = mix(col, vec3(0.98, 0.60, 0.36), pow(1.0 - abs(n.y), 6.0) * 0.35);
        // sun glitter path
        vec3 R = reflect(-V, n);
        float s = max(dot(R, uSunDir), 0.0);
        float glitter = pow(s, 700.0) * 2.4 + pow(s, 60.0) * 0.35;
        // sparkle noise on the path
        float sp = sin(vWorld.x * 2.7 + uTime * 2.0) * sin(vWorld.z * 3.1 - uTime * 1.6);
        glitter *= 0.75 + 0.5 * smoothstep(0.2, 1.0, sp);
        col += vec3(1.0, 0.72, 0.42) * glitter;
        // manual exp2 fog
        float depth = length(uCamPos - vWorld);
        float f = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
        col = mix(col, uFogColor, clamp(f, 0.0, 1.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800, 140, 140), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);

  // ---------- lights ----------
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.2);
  sun.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x9db4d8, 0x1a2a38, 0.85));
  const bounce = new THREE.PointLight(0xffb877, 12, 60, 1.6);
  bounce.position.set(-18, 4, -26);
  scene.add(bounce);

  // ---------- drifting mist ----------
  const mistTexture = mistTex();
  const mistGroup = new THREE.Group();
  const mistMat = new THREE.SpriteMaterial({
    map: mistTexture, transparent: true, opacity: 0.16,
    depthWrite: false, fog: false,
  });
  const mists = [];
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Sprite(mistMat.clone());
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

  // ---------- distant island silhouettes ----------
  const islMat = new THREE.MeshBasicMaterial({ color: 0x4a3a52, fog: false, transparent: true, opacity: 0.85 });
  const islands = new THREE.Group();
  const islDefs = [
    { x: -260, z: -420, w: 190, h: 34 }, { x: 300, z: -380, w: 150, h: 26 },
    { x: -80, z: -520, w: 260, h: 44 }, { x: 420, z: 180, w: 170, h: 30 },
    { x: -430, z: 140, w: 200, h: 36 },
  ];
  for (const d of islDefs) {
    const geo = new THREE.ConeGeometry(d.w / 2, d.h, 7, 1);
    const m = new THREE.Mesh(geo, islMat);
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
    update(t, dt, camPos) {
      skyMat.uniforms.uTime.value = t;
      waterMat.uniforms.uTime.value = t;
      waterMat.uniforms.uCamPos.value.copy(camPos);
      for (const s of mists) {
        const u = s.userData;
        s.position.x += Math.sin(t * 0.05 + u.phase) * dt * u.speed;
        s.position.z += Math.cos(t * 0.04 + u.phase) * dt * u.speed * 0.7;
        s.position.y = u.baseY + Math.sin(t * 0.18 + u.phase) * 0.8;
      }
      // motes drift upward slowly, wrap
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
