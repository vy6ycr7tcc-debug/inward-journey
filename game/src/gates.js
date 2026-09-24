// Inward Journey — the seven floating drawings as living gates.
// GSAP-choreographed camera flights, ink-reveal shader, particle breath.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { input } from './input.js';

const GATES = [
  { art: 'drawing-01.jpg', line: 'the mind builds the room; the spirit opens the window' },
  { art: 'drawing-02.jpg', line: 'breathe in — you are the lake, not the ripple' },
  { art: 'drawing-03.jpg', line: 'the body is a temple the soul chose to visit' },
  { art: 'drawing-04.jpg', line: 'let the light do the carrying for a while' },
  { art: 'drawing-05.jpg', line: 'every ending is a door drawn in disappearing ink' },
  { art: 'drawing-06.jpg', line: 'stillness is not empty; it is full of arrival' },
  { art: 'drawing-07.jpg', line: 'you were never lost — only beautifully exploring' },
];

export function buildGates(scene, camera, audio) {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const gates = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let focused = null;
  const lookTarget = new THREE.Vector3(0, 2.2, 0);
  let returning = false;

  // ink-mote particles shared across gates
  const moteGeo = new THREE.BufferGeometry();
  const MOTES = 260;
  const motePos = new Float32Array(MOTES * 3);
  const moteVel = new Float32Array(MOTES * 3);
  const moteLife = new Float32Array(MOTES);
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xffd9a0, size: 0.55, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  scene.add(motes);
  let moteCursor = 0;

  function burst(center, n = 46) {
    for (let i = 0; i < n; i++) {
      const k = moteCursor = (moteCursor + 1) % MOTES;
      motePos[k * 3] = center.x + (Math.random() - 0.5) * 2;
      motePos[k * 3 + 1] = center.y + (Math.random() - 0.5) * 2.5;
      motePos[k * 3 + 2] = center.z + (Math.random() - 0.5) * 2;
      const a = Math.random() * Math.PI * 2;
      moteVel[k * 3] = Math.cos(a) * (0.4 + Math.random() * 1.2);
      moteVel[k * 3 + 1] = 0.8 + Math.random() * 1.8;
      moteVel[k * 3 + 2] = Math.sin(a) * (0.4 + Math.random() * 1.2);
      moteLife[k] = 1;
    }
  }

  GATES.forEach((def, i) => {
    const angle = (i / GATES.length) * Math.PI * 2 + 0.35;
    const radius = 26 + (i % 2) * 9;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 6;
    const y = 4.6 + Math.sin(i * 2.1) * 1.6;

    const group = new THREE.Group();
    group.position.set(x, y, z);

    // living halo rings
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 3.95, 72),
      new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(4.5, 4.62, 72),
      new THREE.MeshBasicMaterial({ color: 0xfff3d9, transparent: true, opacity: 0.22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(ring2);

    // the drawing itself — patched with an ink-reveal sweep
    let frame;
    const tex = loader.load('../../art/' + def.art, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      const asp = t.image.width / t.image.height;
      frame.scale.set(6.4 * Math.min(asp, 1.4), 6.4 / Math.max(asp, 0.72), 1);
    });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    mat.userData.uniforms = { uReveal: { value: 0 }, uTime: { value: 0 } };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uReveal = mat.userData.uniforms.uReveal;
      sh.uniforms.uTime = mat.userData.uniforms.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vRevealUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRevealUv = uv;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vRevealUv;\nuniform float uReveal;\nuniform float uTime;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          {
            float edge = abs(vRevealUv.x - uReveal);
            float glowLine = smoothstep(0.10, 0.0, edge);
            float revealed = step(vRevealUv.x, uReveal);
            float shimmer = 0.5 + 0.5 * sin(uTime * 2.2 + vRevealUv.y * 24.0);
            diffuseColor.rgb = mix(diffuseColor.rgb * 0.15, diffuseColor.rgb, revealed);
            diffuseColor.rgb += vec3(1.0, 0.72, 0.38) * glowLine * (1.2 + shimmer * 0.8);
          }`);
    };
    frame = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), mat);
    group.add(frame);

    const light = new THREE.PointLight(0xffbe78, 60, 26, 2);
    group.add(light);

    group.scale.setScalar(0.001);
    group.userData = { baseY: y, phase: Math.random() * Math.PI * 2, frame, ring, ring2, mat, revealed: false, line: def.line, center: new THREE.Vector3(x, y, z) };
    group.lookAt(0, y, -6);
    scene.add(group);
    gates.push(group);
  });

  // ---------- GSAP camera choreography ----------
  function flyTo(pos, look, dur = 2.4) {
    gsap.killTweensOf(camera.position);
    gsap.killTweensOf(lookTarget);
    gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: dur, ease: 'power3.inOut' });
    gsap.to(lookTarget, { x: look.x, y: look.y, z: look.z, duration: dur, ease: 'power3.inOut' });
  }

  function focus(g) {
    focused = g;
    returning = false;
    const c = g.userData.center;
    const dir = new THREE.Vector3(c.x, 0, c.z + 6).normalize();
    const camPos = new THREE.Vector3(c.x + dir.x * 10.5, c.y + 1.6, c.z + dir.z * 10.5);
    flyTo(camPos, new THREE.Vector3(c.x, c.y, c.z), 2.6);
    if (!g.userData.revealed) {
      g.userData.revealed = true;
      gsap.to(g.userData.mat.userData.uniforms.uReveal, { value: 1, duration: 3.2, ease: 'power2.inOut', delay: 0.9 });
    }
    burst(c, 60);
    audio.chime(523.25 * 0.5);
    setTimeout(() => audio.chime(783.99 * 0.5), 700);
    gsap.to(g.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 1.6, ease: 'sine.inOut' });
    showCaption(g.userData.line);
  }

  function unfocus() {
    if (!focused) return;
    const g = focused;
    focused = null;
    returning = true;
    gsap.to(g.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'sine.inOut' });
    hideCaption();
    audio.breath();
    const p = window.__ij_playerPos || new THREE.Vector3(0, 0, 0);
    flyTo(new THREE.Vector3(p.x, 6.2, p.z + 13), new THREE.Vector3(p.x, 2.4, p.z), 2.2);
    setTimeout(() => { returning = false; }, 2300);
  }

  // ---------- DOM caption ----------
  const caption = document.getElementById('caption');
  const captionText = document.getElementById('caption-text');
  document.getElementById('caption-close').addEventListener('click', unfocus);
  function showCaption(line) {
    captionText.textContent = '“' + line + '”';
    caption.classList.remove('hidden');
    gsap.fromTo(caption, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 1.2 });
  }
  function hideCaption() {
    gsap.to(caption, { opacity: 0, y: 12, duration: 0.6, ease: 'power2.in', onComplete: () => caption.classList.add('hidden') });
  }

  // ---------- tap picking ----------
  function tap(px, py) {
    pointer.x = (px / innerWidth) * 2 - 1;
    pointer.y = -(py / innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const frames = gates.map(g => g.userData.frame);
    const hits = raycaster.intersectObjects(frames, false);
    if (hits.length) {
      const g = gates[frames.indexOf(hits[0].object)];
      if (focused === g) unfocus();
      else focus(g);
      return;
    }
    if (focused) unfocus();
  }
  input.onTap = (x, y) => tap(x, y);

  // ---------- per-frame ----------
  function update(elapsed, dt) {
    for (const g of gates) {
      const u = g.userData;
      g.position.y = u.baseY + Math.sin(elapsed * 0.5 + u.phase) * 0.55;
      u.ring.rotation.z += dt * 0.12;
      u.ring2.rotation.z -= dt * 0.07;
      const s = 1 + Math.sin(elapsed * 1.1 + u.phase) * 0.05;
      u.ring.scale.setScalar(s);
      u.ring.material.opacity = 0.3 + Math.sin(elapsed * 0.9 + u.phase) * 0.14;
      u.mat.userData.uniforms.uTime.value = elapsed;
      g.lookAt(0, g.position.y, -6);
    }
    for (let k = 0; k < MOTES; k++) {
      if (moteLife[k] <= 0) continue;
      moteLife[k] -= dt * 0.5;
      motePos[k * 3] += moteVel[k * 3] * dt;
      motePos[k * 3 + 1] += moteVel[k * 3 + 1] * dt;
      motePos[k * 3 + 2] += moteVel[k * 3 + 2] * dt;
    }
    moteGeo.attributes.position.needsUpdate = true;
    moteMat.opacity = 0.65 + Math.sin(elapsed * 1.3) * 0.2;
  }

  function driveCamera() {
    if (focused || returning) {
      camera.lookAt(lookTarget);
      return true;
    }
    return false;
  }

  function entrance() {
    gates.forEach((g, i) => {
      gsap.to(g.scale, {
        x: 1, y: 1, z: 1, duration: 2.2, ease: 'back.out(1.4)', delay: 1.2 + i * 0.4,
        onStart: () => burst(g.userData.center, 24),
      });
    });
  }

  return { update, driveCamera, tap, entrance, gates };
}
