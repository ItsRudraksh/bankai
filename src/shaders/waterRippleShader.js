import * as THREE from 'three';

/**
 * Clean dark obsidian mirror water plane.
 * Emits crisp concentric ripples ONLY during the sword-drop release (Act I),
 * keeping reflections crystal clear everywhere else.
 */
export function createWaterRippleOverlay() {
  const uniforms = {
    uTime: { value: 0.0 },
    uDropRipple: { value: 0.0 },
    uSakuraTint: { value: 0.0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uDropRipple;
      uniform float uSakuraTint;
      varying vec3 vWorldPos;

      void main() {
        float dist = length(vWorldPos.xz - vec2(0.0, 0.5));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - clamp(abs(viewDir.y), 0.0, 1.0), 2.6);

        // Deep dark obsidian tint lets planar reflections stay crisp and legible
        vec3 baseWater = mix(vec3(0.008, 0.012, 0.024), vec3(0.025, 0.035, 0.068), fresnel);
        baseWater = mix(baseWater, vec3(0.055, 0.012, 0.04), uSakuraTint * 0.4);

        // Concentric sword-drop water waves (active only during release 0 < uDropRipple < 1)
        float ringGlow = 0.0;
        if (uDropRipple > 0.005 && uDropRipple < 0.995) {
          float fadeAll = smoothstep(0.0, 0.08, uDropRipple) * (1.0 - smoothstep(0.65, 1.0, uDropRipple));
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float rProg = clamp(uDropRipple * 1.35 - fi * 0.22, 0.0, 1.0);
            float targetR = mix(0.2, 14.0, 1.0 - pow(1.0 - rProg, 2.4));
            float ringMask = exp(-abs(dist - targetR) * 3.8) * (1.0 - rProg);
            ringGlow += ringMask * (0.95 - fi * 0.22) * fadeAll;
          }
        }

        vec3 rippleColor = vec3(0.85, 0.95, 1.15);
        vec3 finalCol = baseWater + rippleColor * ringGlow * 0.9;

        float distFade = smoothstep(72.0, 10.0, dist);
        float alpha = mix(0.76, 0.42, fresnel) * distFade + clamp(ringGlow * 0.45, 0.0, 0.55);

        gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 0.9));
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.position.y = 0.012;
  return { mesh, uniforms };
}
