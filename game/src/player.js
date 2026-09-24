// The wanderer: a luminous figure gliding over the water, third-person camera.
import * as THREE from 'three';
import { input, consumeLook } from './input.js';
import { softGlowTex, SUN_DIR } from './world.js';

const SPEED = 7.5;
const WORLD_R = 150; // soft boundary of the walkable lake

export function buildPlayer(scene, camera) {
  const group = new THREE.Group();

  // body: soft luminous form
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xfff4e0, emissive: 0xffd9a0, emissiveIntensity: 1.15,
    roughness: 0.35, metalness: 0.0, transparent: true, opacity: 0.96,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 6, 14), bodyMat);
  body.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.30, 20, 16), bodyMat);
  head.position.y = 2.42;
  // trailing veil
  const veilMat = new THREE.MeshBasicMaterial({
    color: 0xffd9a8, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const veil = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.9, 12, 1, true), veilMat);
  veil.position.y = 0.95;
  group.add(body, head, veil);

  // halo glow
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softGlowTex(), color: 0xffdfae, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(4.2, 5.4, 1);
  glow.position.y = 1.6;
  group.add(glow);

  // warm light carried by the wanderer
  const lamp = new THREE.PointLight(0xffc98a, 26, 26, 1.8);
  lamp.position.y = 2.2;
  group.add(lamp);

  // light trail footprints
  const trailMat = new THREE.MeshBasicMaterial({
    map: softGlowTex(), color: 0xffd9a0, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const trail = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), trailMat.clone());
    s.rotation.x = -Math.PI / 2; s.position.y = 0.06;
    s.visible = false; s.userData.life = 0;
    scene.add(s); trail.push(s);
  }
  let trailTimer = 0, trailIdx = 0;

  // expanding ripple rings
  const ripples = [];
  const rippleGeo = new THREE.RingGeometry(0.85, 1.0, 40);
  function spawnRipple(x, z, big = false) {
    const m = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({
      color: 0xffe4bb, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
    m.userData = { t: 0, big };
    scene.add(m); ripples.push(m);
  }

  scene.add(group);

  // camera rig
  let yaw = Math.PI * 0.15, pitch = 0.32, dist = 10.5;
  const camTarget = new THREE.Vector3();
  const desired = new THREE.Vector3();

  const vel = new THREE.Vector3();
  const fwd = new THREE.Vector3(), rgt = new THREE.Vector3();

  let focusMode = false; // camera driven by gates during focus
  let externallyDriven = false;

  const player = {
    group,
    get pos() { return group.position; },
    setCameraDriven(v) { externallyDriven = v; },
    update(t, dt) {
      // --- look ---
      const { dx, dy } = consumeLook();
      if (!externallyDriven) {
        yaw -= dx * 0.0042;
        pitch = THREE.MathUtils.clamp(pitch + dy * 0.0032, 0.08, 1.15);
      }

      // --- move (camera-relative) ---
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      rgt.set(-fwd.z, 0, fwd.x);
      const ix = input.move.x, iz = input.move.z;
      desired.set(0, 0, 0)
        .addScaledVector(fwd, -iz)
        .addScaledVector(rgt, ix);
      const moving = desired.lengthSq() > 0.0001;
      if (moving) {
        desired.normalize().multiplyScalar(SPEED);
        // face travel direction smoothly
        const targetRot = Math.atan2(desired.x, desired.z);
        let dr = targetRot - group.rotation.y;
        while (dr > Math.PI) dr -= Math.PI * 2;
        while (dr < -Math.PI) dr += Math.PI * 2;
        group.rotation.y += dr * Math.min(1, dt * 7);
      }
      vel.lerp(desired, Math.min(1, dt * 5.5));
      group.position.addScaledVector(vel, dt);

      // soft world boundary
      const r = Math.hypot(group.position.x, group.position.z);
      if (r > WORLD_R) {
        group.position.multiplyScalar(WORLD_R / r);
      }

      // bob on the water
      group.position.y = Math.sin(t * 1.1) * 0.14 + 0.12;
      const speedF = vel.length() / SPEED;
      body.position.y = 1.35 + Math.sin(t * (2.2 + speedF * 3.4)) * 0.07 * (0.4 + speedF);
      head.position.y = 2.42 + Math.sin(t * (2.2 + speedF * 3.4) + 0.6) * 0.05;
      veil.rotation.y = t * (0.5 + speedF * 1.6);
      veilMat.opacity = 0.16 + speedF * 0.14;
      glow.material.opacity = 0.5 + Math.sin(t * 1.7) * 0.08;
      lamp.intensity = 24 + Math.sin(t * 1.7) * 4;

      // footprints + ripples while moving
      if (speedF > 0.25) {
        trailTimer -= dt;
        if (trailTimer <= 0) {
          trailTimer = 0.16;
          const s = trail[trailIdx++ % trail.length];
          s.visible = true;
          s.position.set(group.position.x, 0.06, group.position.z);
          s.scale.setScalar(0.7);
          s.userData.life = 1;
        }
        if (Math.random() < dt * 1.4) spawnRipple(group.position.x, group.position.z);
      }

      for (const s of trail) {
        if (!s.visible) continue;
        s.userData.life -= dt * 0.5;
        if (s.userData.life <= 0) { s.visible = false; continue; }
        s.material.opacity = s.userData.life * 0.5;
        s.scale.setScalar(s.scale.x + dt * 0.9);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const m = ripples[i]; m.userData.t += dt;
        const k = m.userData.t / (m.userData.big ? 2.6 : 1.6);
        if (k >= 1) { scene.remove(m); m.material.dispose(); ripples.splice(i, 1); continue; }
        const sc = 1 + k * (m.userData.big ? 26 : 9);
        m.scale.set(sc, sc, 1);
        m.material.opacity = 0.5 * (1 - k);
      }

      // --- camera ---
      if (!externallyDriven) {
        camTarget.copy(group.position).add(new THREE.Vector3(0, 2.0, 0));
        desired.set(
          camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist,
          camTarget.y + Math.sin(pitch) * dist,
          camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist
        );
        camera.position.lerp(desired, Math.min(1, dt * 4.2));
        camera.lookAt(camTarget);
      }
    },
    spawnCelebrationRipple() {
      spawnRipple(group.position.x, group.position.z, true);
    },
  };
  return player;
}
