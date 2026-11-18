import * as THREE from "three";
import { createGiantBladeGeometry } from "./geometries.js";
import { createGiantBladeMaterial } from "../shaders/bladeDissolveShader.js";

const invLerp = (a, b, v) => Math.max(0, Math.min(1, (v - a) / (b - a)));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const smoothstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

/**
 * 88 Giant Steel Pillars. Cleanly finishes Royal Rebirth dissolve by t = 0.902
 * so Ikka Senjinka enters cleanly without overlapping geometry.
 */
export function createColonnadeSystem() {
  const geo = createGiantBladeGeometry();
  const count = 88;
  const seeds = new Float32Array(count);
  const placements = [];

  let idx = 0;
  for (const tierOffset of [4.8, 8.6]) {
    for (let zIdx = 0; zIdx < 22; zIdx++) {
      const z = 5.0 - zIdx * 2.85;
      for (const side of [-1, 1]) {
        placements.push({
          x: side * tierOffset,
          z,
          side,
          isOuter: tierOffset > 6,
          depthFrac: zIdx / 21,
          fullHeight: tierOffset > 6 ? 27.0 : 23.0,
        });
        seeds[idx++] = ((zIdx * 17 + (side > 0 ? 5 : 11)) % 29) / 29;
      }
    }
  }

  geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  const material = createGiantBladeMaterial();
  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();

  return {
    mesh,
    update(t, time) {
      const classicPhase = t >= 0.11 && t <= 0.335;
      const royalPhase = t >= 0.815 && t <= 0.905;

      mesh.visible = classicPhase || royalPhase;
      if (!mesh.visible) return;

      const u = material.userData.uniforms;
      u.uTime.value = time;

      if (classicPhase) {
        const riseGlobal = invLerp(0.115, 0.21, t);
        const scatter = smoothstep(0.21, 0.305, t);
        u.uDissolve.value = scatter;
        u.uRoyalGold.value = 0.0;

        for (let i = 0; i < count; i++) {
          const p = placements[i];
          if (p.isOuter) {
            dummy.scale.set(0, 0, 0);
          } else {
            const stagger = easeOutCubic(
              invLerp(
                p.depthFrac * 0.35,
                p.depthFrac * 0.35 + 0.55,
                riseGlobal,
              ),
            );
            const h = Math.max(0.001, p.fullHeight * stagger);
            dummy.position.set(p.x, -0.05, p.z);
            dummy.rotation.set(
              0,
              p.side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5,
              0,
            );
            dummy.scale.set(2.4, h, 2.4);
          }
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
      } else {
        const royalRise = invLerp(0.815, 0.875, t);
        const royalOut = smoothstep(0.878, 0.904, t);
        u.uDissolve.value = royalOut * 1.05;
        u.uRoyalGold.value = 1.0 - royalOut;

        for (let i = 0; i < count; i++) {
          const p = placements[i];
          const delay = p.depthFrac * 0.22 + (p.isOuter ? 0.1 : 0.0);
          const stagger = easeOutCubic(invLerp(delay, delay + 0.5, royalRise));
          const h = Math.max(0.001, p.fullHeight * stagger);
          dummy.position.set(p.x, -0.05, p.z);
          dummy.rotation.set(0, p.side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5, 0);
          dummy.scale.set(2.6, h, 2.6);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
