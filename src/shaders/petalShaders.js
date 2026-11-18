import * as THREE from 'three';

/**
 * Opaque depth-buffered 3D sakura petals (no additive whiteout stacking).
 * Individual shards shrink to zero smoothly on transitions and shade from
 * deep plum undersides to cherry-blossom pink with sparse metallic glints.
 */
export function createPetalMaterial() {
  const uniforms = {
    uTime: { value: 0.0 },
    uScroll: { value: 0.0 },
    uVisibility: { value: 0.0 },
    uScatter: { value: 0.0 },
    uSurge: { value: 0.0 },
    uGokei: { value: 0.0 },
    uGokeiRadius: { value: 11.5 },
    uGokeiBlast: { value: 0.0 },
    uSenkeiAmbient: { value: 0.0 },
    uIkkaStorm: { value: 0.0 },
    uPointer3D: { value: new THREE.Vector3(0, 2, 0) },
    uReducedMotion: { value: 0.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true,
    vertexShader: `
      attribute vec4 aMeta;   // x: phase, y: speed, z: lane, w: size
      attribute vec4 aSphere; // xyz: unit Fibonacci sphere, w: spinSeed

      uniform float uTime;
      uniform float uScroll;
      uniform float uVisibility;
      uniform float uScatter;
      uniform float uSurge;
      uniform float uGokei;
      uniform float uGokeiRadius;
      uniform float uGokeiBlast;
      uniform float uSenkeiAmbient;
      uniform float uIkkaStorm;
      uniform vec3 uPointer3D;
      uniform float uReducedMotion;

      varying vec3 vNormalView;
      varying float vSpark;
      varying float vDepth;

      mat3 rotY(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
      }
      mat3 rotX(float a) {
        float c = cos(a), s = sin(a);
        return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c);
      }
      mat3 rotZ(float a) {
        float c = cos(a), s = sin(a);
        return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
      }

      void main() {
        float seed = aSphere.w;
        float individualScale = smoothstep(seed * 0.42, seed * 0.42 + 0.3, uVisibility);
        if (individualScale <= 0.01) {
          gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
          return;
        }

        float phase = aMeta.x;
        float speed = aMeta.y;
        float lane = aMeta.z;
        float size = aMeta.w * 0.72 * individualScale;

        float animT = mix(uTime, 0.0, uReducedMotion);
        float speedMult = mix(1.0, 2.25, uSurge);

        // 1. SCATTER: Wide sweeping helical blade currents
        float prog = fract(phase + animT * speed * 0.16 * speedMult + uScroll * 3.5);
        float helixAngle = prog * 13.0 + lane * 1.5708 + animT * 0.6 * speedMult;
        float helixR = 3.0 + (1.0 - abs(prog - 0.5) * 1.4) * 7.8 + sin(seed * 9.0 + animT) * 2.0;
        vec3 posScatter = vec3(
          cos(helixAngle) * helixR,
          0.45 + prog * 8.2 + sin(helixAngle * 1.6 + seed) * 1.5,
          sin(helixAngle) * helixR - 2.0
        );
        vec3 toCursor = uPointer3D - posScatter;
        float cursorPull = exp(-length(toCursor) * 0.14) * uSurge * 0.78;
        posScatter += toCursor * cursorPull;

        // 2. GOKEI: Hollow Fibonacci sphere collapsing inward
        float gAngle = animT * 0.9 + uScroll * 8.5;
        vec3 sphRot = rotY(gAngle) * rotX(sin(gAngle * 0.4) * 0.35) * aSphere.xyz;
        vec3 posGokei = vec3(0.0, 3.1, 0.0) + sphRot * uGokeiRadius;
        posGokei += sphRot * uGokeiBlast * 16.0;

        // 3. SENKEI AMBIENT: Sparse gentle snowfall inside blade cathedral
        float fall = fract(phase + animT * speed * 0.055 + uScroll * 1.3);
        vec3 posSenkei = vec3(
          aSphere.x * 12.5 + sin(animT * 0.6 + seed * 6.28) * 0.9,
          mix(13.5, 0.2, fall),
          aSphere.z * 12.5 + cos(animT * 0.5 + seed * 6.28) * 0.9
        );

        // 4. IKKA SENJINKA: Convergent radial blizzard
        float ikkaProg = fract(phase + animT * speed * 0.22 + uScroll * 4.2);
        float ikkaAng = seed * 6.28318 + animT * 1.1;
        float ikkaR = mix(17.5, 0.6, ikkaProg) + sin(ikkaProg * 6.28) * 2.5;
        vec3 posIkka = vec3(
          cos(ikkaAng) * ikkaR,
          1.2 + (aSphere.y * 0.5 + 0.5) * 9.0 + sin(ikkaProg * 9.0) * 1.2,
          sin(ikkaAng) * ikkaR - 1.5
        );

        float totalW = max(0.0001, uScatter + uGokei + uSenkeiAmbient + uIkkaStorm);
        vec3 worldCenter = (
          posScatter * uScatter +
          posGokei * uGokei +
          posSenkei * uSenkeiAmbient +
          posIkka * uIkkaStorm
        ) / totalW;

        float spin = seed * 6.283 + animT * (2.2 + speed * 3.8) * speedMult;
        mat3 tumble = rotY(spin) * rotX(spin * 0.7) * rotZ(spin * 0.45);
        vec3 localPos = position * size;
        localPos.y *= (1.0 + uSurge * 0.55 + uIkkaStorm * 0.4);
        vec3 worldPos = worldCenter + tumble * localPos;

        vec4 viewPos = modelViewMatrix * vec4(worldPos, 1.0);
        vDepth = clamp(-viewPos.z / 32.0, 0.0, 1.0);
        vNormalView = normalize(normalMatrix * (tumble * normal));
        vSpark = seed;

        gl_Position = projectionMatrix * viewPos;
      }
    `,
    fragmentShader: `
      varying vec3 vNormalView;
      varying float vSpark;
      varying float vDepth;

      void main() {
        vec3 n = normalize(vNormalView);
        vec3 lightDir = normalize(vec3(0.45, 0.85, 0.5));
        float diffuse = abs(dot(n, lightDir));
        float spec = pow(max(0.0, abs(dot(n, normalize(lightDir + vec3(0.0, 0.0, 1.0))))), 18.0);

        // Distinct 3D shading: deep plum-rose underside -> cherry pink face -> rare crisp steel glint
        vec3 shadowTone = vec3(0.38, 0.09, 0.26);
        vec3 sakuraMid = vec3(0.92, 0.36, 0.66);
        vec3 sakuraBright = vec3(1.04, 0.72, 0.88);
        vec3 steelGlint = vec3(1.42, 1.24, 1.38);

        vec3 col = mix(shadowTone, sakuraMid, smoothstep(0.1, 0.75, diffuse));
        col = mix(col, sakuraBright, smoothstep(0.75, 0.98, diffuse));
        col = mix(col, steelGlint, spec * step(0.65, fract(vSpark * 11.7)));

        // Atmospheric depth fog keeps background petals softly recessed behind foreground
        col = mix(col, vec3(0.05, 0.02, 0.06), vDepth * 0.65);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  return { material, uniforms };
}
