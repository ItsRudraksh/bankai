import * as THREE from "three";

/**
 * Brushed dark gunmetal-steel material tuned to eliminate left-wall white glare
 * while keeping crisp specular cutting-edge bevels and HDR plasma burn line.
 */
export function createGiantBladeMaterial() {
  const uniforms = {
    uDissolve: { value: 0.0 },
    uTime: { value: 0.0 },
    uRoyalGold: { value: 0.0 },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: 0x45536b,
    metalness: 0.86,
    roughness: 0.34,
    envMapIntensity: 0.46,
  });

  mat.userData.uniforms = uniforms;
  mat.customProgramCacheKey = () => "giant-blade-dissolve-v3";

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aSeed;
        varying float vBladeY;
        varying float vSeed;
        varying vec3 vLocalPos;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vBladeY = position.y;
        vSeed = aSeed;
        vLocalPos = position;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uDissolve;
        uniform float uTime;
        uniform float uRoyalGold;
        varying float vBladeY;
        varying float vSeed;
        varying vec3 vLocalPos;

        float bladeHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float bladeNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(bladeHash(i), bladeHash(i + vec2(1.0, 0.0)), u.x),
            mix(bladeHash(i + vec2(0.0, 1.0)), bladeHash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }`,
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        float nVal = bladeNoise(vec2(vLocalPos.z * 9.0 + vSeed * 13.0, vBladeY * 14.0 - uTime * 0.4));
        float cutoff = 1.08 - uDissolve * 1.24 + (nVal - 0.5) * 0.16;
        if (uDissolve > 0.001 && vBladeY > cutoff) discard;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float edgeSheen = smoothstep(0.16, 0.28, vLocalPos.z);
        totalEmissiveRadiance += vec3(0.24, 0.30, 0.42) * edgeSheen;

        if (uDissolve > 0.001) {
          float distToEdge = cutoff - vBladeY;
          float plasmaBand = smoothstep(0.12, 0.0, distToEdge);
          float hotCore = smoothstep(0.035, 0.0, distToEdge);
          vec3 sakuraPlasma = mix(vec3(1.05, 0.16, 0.62), vec3(1.38, 0.95, 1.25), hotCore);
          totalEmissiveRadiance += sakuraPlasma * plasmaBand * 0.92;
        }
        if (uRoyalGold > 0.01) {
          float rimBand = smoothstep(0.76, 1.0, vBladeY);
          totalEmissiveRadiance += vec3(0.30, 0.22, 0.07) * rimBand * uRoyalGold;
        }`,
      );
  };

  return mat;
}
