export const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uChromatic: { value: 0.0012 },
    uVignette: { value: 0.42 },
    uFlash: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uChromatic;
    uniform float uVignette;
    uniform float uFlash;
    varying vec2 vUv;

    float filmRand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233)) + uTime * 0.37) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float r2 = dot(centered, centered);
      float radialDist = sqrt(r2);

      vec2 offset = centered * r2 * uChromatic * 5.0;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 col = vec3(r, g, b);

      float vig = 1.0 - smoothstep(0.28, 0.94, radialDist) * uVignette;
      col *= vig;

      // Radial center-only light flare so dark sky corners remain pure obsidian black
      float centerFlare = exp(-radialDist * 3.4) * clamp(uFlash, 0.0, 0.42);
      col += vec3(0.95, 0.88, 0.98) * centerFlare;

      float grain = (filmRand(vUv * 800.0) - 0.5) * 0.018;
      col += grain;

      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};
