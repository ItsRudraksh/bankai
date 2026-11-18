import * as THREE from 'three';
import { createSenkeiKatanaGeometry } from './geometries.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => Math.pow(t, 3);

function smoothstep_local(a, b, v) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 240 Forged 3D Senkei Katana with crisp neon-rose edges & distinct bronze tsubas.
 */
export function createSenkeiSystem() {
  const geo = createSenkeiKatanaGeometry();
  const glowUniforms = {
    uGlow: { value: 0.9 },
  };

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.85,
    roughness: 0.25,
    envMapIntensity: 0.6,
  });

  mat.customProgramCacheKey = () => 'senkei-katana-glow-v2';
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, glowUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBladeCol;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBladeCol = color;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGlow;
        varying vec3 vBladeCol;`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float bladeMask = smoothstep(0.68, 0.92, vBladeCol.r);
        vec3 plasma = mix(vec3(1.15, 0.24, 0.68), vec3(1.55, 1.15, 1.42), 0.35);
        totalEmissiveRadiance += plasma * bladeMask * uGlow;`
      );
  };

  const tiers = 4;
  const perTier = 60;
  const count = tiers * perTier;
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const targetVec = new THREE.Vector3(0, 1.4, -2.5);

  return {
    mesh,
    update(t, time, reducedMotion) {
      const inSenkei = t >= 0.485 && t <= 0.665;
      const inIkka = t >= 0.90 && t <= 1.0;

      mesh.visible = inSenkei || inIkka;
      if (!mesh.visible) return;

      const animT = reducedMotion ? 0 : time;

      if (inSenkei) {
        const p = invLerp(0.49, 0.65, t);
        const appear = easeOutCubic(invLerp(0.0, 0.22, p));
        const converge = easeInCubic(invLerp(0.84, 1.0, p));
        glowUniforms.uGlow.value = lerp(0.85, 1.45, converge);

        let idx = 0;
        for (let tier = 0; tier < tiers; tier++) {
          const dir = tier % 2 === 0 ? 1 : -1;
          const baseY = 1.6 + tier * 2.8;
          const tierAppear = easeOutCubic(invLerp(tier * 0.05, tier * 0.05 + 0.18, p));

          for (let i = 0; i < perTier; i++) {
            const baseAng = (i / perTier) * Math.PI * 2 + tier * 0.12;
            const ang = baseAng + (animT * 0.16 + p * 1.9) * dir;
            const radius = lerp(10.5, 0.35, converge);

            const x = Math.cos(ang) * radius;
            const z = Math.sin(ang) * radius;
            const bob = Math.sin(animT * 1.4 + i * 0.3 + tier) * 0.14 * (1 - converge);
            const y = lerp(baseY + bob, 1.35, converge);

            dummy.position.set(x, y, z);
            dummy.rotation.set(0, -ang + Math.PI * 0.5, Math.PI);
            const s = 1.42 * appear * tierAppear * (1.0 - converge * 0.6);
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx++, dummy.matrix);
          }
        }
      } else {
        const p = invLerp(0.905, 1.0, t);
        const lockAim = easeOutCubic(invLerp(0.0, 0.25, p));
        const strike = invLerp(0.22, 0.82, p);
        glowUniforms.uGlow.value = 1.15;

        let idx = 0;
        for (let tier = 0; tier < tiers; tier++) {
          const waveDrive = easeInCubic(invLerp(tier * 0.16, tier * 0.16 + 0.48, strike));
          const startR = 9.5 + tier * 1.8;
          const radius = lerp(startR, 0.4, waveDrive);
          const height = lerp(2.2 + tier * 1.9, targetVec.y, waveDrive);
          const vanish = 1.0 - smoothstep_local(0.84, 1.0, waveDrive);

          for (let i = 0; i < perTier; i++) {
            const ang = (i / perTier) * Math.PI * 2 + tier * 0.24 + animT * 0.1;
            const x = Math.cos(ang) * radius;
            const z = Math.sin(ang) * radius + targetVec.z;

            dummy.position.set(x, height, z);
            dummy.lookAt(targetVec);
            dummy.rotateX(lerp(0, Math.PI * 0.5, lockAim));
            const s = 1.32 * lockAim * vanish;
            dummy.scale.set(s, s * (1 + waveDrive * 0.8), s);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx++, dummy.matrix);
          }
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
