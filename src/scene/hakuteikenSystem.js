import * as THREE from 'three';
import { createFeatherPlumeGeometry } from './geometries.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Shūkei: Hakuteiken — Shaded 3D plume feathers so every wing layer reads distinctly,
 * crisp vertical white halo ring, shattering prisms, and controlled final slash.
 */
export function createHakuteikenSystem() {
  const group = new THREE.Group();

  const haloMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.32, 1.38, 1.55),
    transparent: true,
    opacity: 0.92,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.072, 16, 72), haloMat);
  halo.position.set(0, 1.95, -0.35);
  group.add(halo);

  // Shaded feather ShaderMaterial (icy steel-blue trailing edge -> luminous pearl ridge)
  const featherUniforms = {
    uOpacity: { value: 0.95 },
  };
  const featherGeo = createFeatherPlumeGeometry();
  const featherMat = new THREE.ShaderMaterial({
    uniforms: featherUniforms,
    side: THREE.DoubleSide,
    transparent: true,
    vertexShader: `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vDepth = clamp(-mv.z / 24.0, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        // Center ridge (vUv.y = 0.5) is bright pearl; edges shade softly indigo-silver
        float ridge = 1.0 - abs(vUv.y - 0.5) * 2.0;
        vec3 edgeBlue = vec3(0.42, 0.54, 0.78);
        vec3 pearlMid = vec3(0.96, 1.02, 1.15);
        vec3 tipGlow = vec3(1.28, 1.32, 1.48);

        vec3 col = mix(edgeBlue, pearlMid, smoothstep(0.0, 0.75, ridge));
        col = mix(col, tipGlow, smoothstep(0.55, 1.0, vUv.x) * 0.7);
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
  });

  const feathersPerSide = 22;
  const wingMesh = new THREE.InstancedMesh(featherGeo, featherMat, feathersPerSide * 2);
  wingMesh.frustumCulled = false;
  group.add(wingMesh);

  const shardGeo = new THREE.OctahedronGeometry(0.12, 0);
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0xb8d4f5,
    emissive: new THREE.Color(0.35, 0.55, 0.85),
    metalness: 0.25,
    roughness: 0.15,
    transparent: true,
    opacity: 0.85,
  });
  const shardCount = 72;
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
  shards.frustumCulled = false;
  group.add(shards);

  const slashGeo = new THREE.TorusGeometry(9.0, 0.24, 12, 64, Math.PI * 0.72);
  const slashMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.45, 0.95, 1.38),
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const slashArc = new THREE.Mesh(slashGeo, slashMat);
  slashArc.position.set(0, 2.0, 1.0);
  slashArc.rotation.z = -0.42;
  group.add(slashArc);

  const dummy = new THREE.Object3D();

  return {
    group,
    update(t, time, reducedMotion) {
      const active = t >= 0.645 && t <= 0.805;
      group.visible = active;
      if (!active) return;

      const p = invLerp(0.65, 0.80, t);
      const spread = easeOutCubic(invLerp(0.04, 0.42, p));
      const slashProg = easeOutCubic(invLerp(0.56, 0.92, p));
      const fadeEnd = 1.0 - invLerp(0.88, 1.0, p);
      const flutter = reducedMotion ? 0 : Math.sin(time * 2.2) * 0.032;

      halo.scale.setScalar(Math.max(0.01, spread));
      haloMat.opacity = spread * fadeEnd * 0.92;

      let idx = 0;
      for (const side of [-1, 1]) {
        for (let f = 0; f < feathersPerSide; f++) {
          const frac = f / (feathersPerSide - 1);
          const ang = lerp(-0.55, 0.55, frac) + flutter * (1 - frac * 0.4);
          const len = lerp(5.4, 2.1, Math.pow(frac, 0.8)) * spread;
          const thick = lerp(2.2, 1.1, frac) * spread;

          dummy.position.set(side * 0.25, 1.85 - frac * 0.65, -0.35 - frac * 0.25);
          dummy.rotation.set(0, side > 0 ? 0 : Math.PI, side > 0 ? ang : -ang);
          dummy.scale.set(len, thick, 1.0);
          dummy.updateMatrix();
          wingMesh.setMatrixAt(idx++, dummy.matrix);
        }
      }
      wingMesh.instanceMatrix.needsUpdate = true;
      featherUniforms.uOpacity.value = spread * fadeEnd * 0.94;

      const burstP = easeOutCubic(invLerp(0.05, 0.55, p));
      for (let i = 0; i < shardCount; i++) {
        const a = (i / shardCount) * Math.PI * 2 + (i % 5) * 0.25;
        const elev = ((i * 7) % 13) / 13 - 0.35;
        const r = lerp(0.5, 7.5 + (i % 4) * 1.4, burstP);
        dummy.position.set(Math.cos(a) * r, 1.8 + elev * r * 0.75, Math.sin(a) * r * 0.4 - 0.4);
        dummy.rotation.set(i + time * 0.5, i * 0.7, 0);
        const s = (1.0 - burstP * 0.65) * spread * fadeEnd;
        dummy.scale.set(s * 0.8, s * 2.2, s * 0.8);
        dummy.updateMatrix();
        shards.setMatrixAt(i, dummy.matrix);
      }
      shards.instanceMatrix.needsUpdate = true;

      if (slashProg > 0.01) {
        slashArc.visible = true;
        slashArc.scale.setScalar(lerp(0.65, 1.65, slashProg));
        slashArc.rotation.z = lerp(-0.95, 0.55, slashProg);
        slashMat.opacity = Math.sin(slashProg * Math.PI) * 0.72;
      } else {
        slashArc.visible = false;
      }
    },
  };
}
