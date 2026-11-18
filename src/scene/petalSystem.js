import * as THREE from "three";
import { createCurvedPetalGeometry } from "./geometries.js";
import { createPetalMaterial } from "../shaders/petalShaders.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smoothstep = (a, b, v) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 2,800 Opaque Depth-Sorted 3D Sakura Petals + Fresnel Gōkei Containment Sphere.
 */
export function createPetalSystem(count = 2800) {
  const group = new THREE.Group();

  const baseGeo = createCurvedPetalGeometry();
  const instGeo = new THREE.InstancedBufferGeometry();
  instGeo.index = baseGeo.index;
  instGeo.attributes.position = baseGeo.attributes.position;
  instGeo.attributes.normal = baseGeo.attributes.normal;
  instGeo.instanceCount = count;

  const meta = new Float32Array(count * 4);
  const sphere = new Float32Array(count * 4);
  const rand = mulberry32(8206);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    meta[i * 4 + 0] = rand();
    meta[i * 4 + 1] = 0.65 + rand() * 0.9;
    meta[i * 4 + 2] = i % 4;
    meta[i * 4 + 3] = 0.55 + rand() * 0.95;

    const y = 1 - (i / (count - 1)) * 2;
    const rY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    sphere[i * 4 + 0] = Math.cos(theta) * rY;
    sphere[i * 4 + 1] = y;
    sphere[i * 4 + 2] = Math.sin(theta) * rY;
    sphere[i * 4 + 3] = rand();
  }

  instGeo.setAttribute("aMeta", new THREE.InstancedBufferAttribute(meta, 4));
  instGeo.setAttribute(
    "aSphere",
    new THREE.InstancedBufferAttribute(sphere, 4),
  );

  const { material, uniforms } = createPetalMaterial();
  const petalMesh = new THREE.Mesh(instGeo, material);
  petalMesh.frustumCulled = false;
  group.add(petalMesh);

  // Fresnel Rim Energy Sphere framing Gōkei's total spherical enclosure (Act III)
  const shellUniforms = {
    uAlpha: { value: 0.0 },
    uTime: { value: 0.0 },
  };
  const shellMat = new THREE.ShaderMaterial({
    uniforms: shellUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    vertexShader: `
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uAlpha;
      uniform float uTime;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        float fresnel = pow(1.0 - clamp(abs(dot(normalize(vNormalV), normalize(vViewPos))), 0.0, 1.0), 3.4);
        float band = 0.75 + 0.25 * sin(vViewPos.y * 2.5 - uTime * 3.0);
        vec3 col = vec3(1.1, 0.28, 0.72) * fresnel * band;
        gl_FragColor = vec4(col, fresnel * uAlpha * 0.65);
      }
    `,
  });
  const gokeiShell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 36, 28),
    shellMat,
  );
  gokeiShell.position.set(0, 3.1, 0);
  group.add(gokeiShell);

  return {
    group,
    update(t, time, pointer, reducedMotion) {
      uniforms.uTime.value = time;
      uniforms.uScroll.value = t;
      uniforms.uReducedMotion.value = reducedMotion ? 1.0 : 0.0;
      uniforms.uPointer3D.value.set(
        pointer.x * 7.5,
        3.0 - pointer.y * 3.5,
        1.5,
      );

      const scatterW =
        smoothstep(0.2, 0.25, t) * (1.0 - smoothstep(0.35, 0.4, t));
      const surgeW =
        smoothstep(0.26, 0.32, t) * (1.0 - smoothstep(0.35, 0.38, t));
      const gokeiW =
        smoothstep(0.35, 0.39, t) * (1.0 - smoothstep(0.47, 0.51, t));
      const senkeiW =
        smoothstep(0.48, 0.52, t) * (1.0 - smoothstep(0.64, 0.67, t));
      const ikkaW = smoothstep(0.9, 0.94, t);

      const gokeiLocal = invLerp(0.36, 0.49, t);
      const crush = Math.pow(invLerp(0.32, 0.74, gokeiLocal), 2.5);
      const blast = 1.0 - Math.pow(1.0 - invLerp(0.73, 0.96, gokeiLocal), 3.0);
      const radius = 11.5 * (1.0 - crush * 0.92);

      uniforms.uScatter.value = scatterW;
      uniforms.uSurge.value = surgeW;
      uniforms.uGokei.value = gokeiW;
      uniforms.uGokeiRadius.value = radius;
      uniforms.uGokeiBlast.value = blast;
      uniforms.uSenkeiAmbient.value = senkeiW * 0.55;
      uniforms.uIkkaStorm.value = ikkaW;

      const vis = Math.max(scatterW, gokeiW, senkeiW * 0.65, ikkaW);
      uniforms.uVisibility.value = vis;
      petalMesh.visible = vis > 0.005;

      // Update Gōkei Fresnel containment globe
      gokeiShell.visible = gokeiW > 0.02 && blast < 0.85;
      gokeiShell.scale.setScalar(Math.max(0.2, radius * 1.02));
      shellUniforms.uAlpha.value = gokeiW * (1.0 - blast);
      shellUniforms.uTime.value = reducedMotion ? 0 : time;

      group.visible = petalMesh.visible || gokeiShell.visible;
    },
  };
}
