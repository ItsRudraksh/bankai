import * as THREE from "three";

/**
 * Refined 3D Byakuya Kuchiki:
 * - Anatomical neck + open crossed V-collar + flowing kimono tamoto sleeves
 * - Flat silk ribbon Ginranpū scarf seated neatly at collarbone (never covering his face)
 * - Framing raven-black hair locks + Kenseikan pins / Royal Ōken collar & head-wrap
 * - Authentic hollow 4-pane window Tsuba on Senbonzakura
 */
export function createByakuyaRig() {
  const root = new THREE.Group();

  const clothUniforms = {
    uTime: { value: 0.0 },
    uWind: { value: 1.0 },
  };

  const makeClothMaterial = (hex, isHaori = false) => {
    const mat = new THREE.MeshStandardMaterial({
      color: hex,
      metalness: 0.02,
      roughness: 0.9,
      envMapIntensity: 0.18,
      side: THREE.DoubleSide,
    });
    mat.customProgramCacheKey = () => `byakuya-cloth-v3-${hex}-${isHaori}`;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, clothUniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uTime;
          uniform float uWind;
          varying vec3 vClothPos;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vClothPos = position;
          float hem = smoothstep(0.95, 0.0, position.y);
          float wave = sin(uTime * 2.8 + position.x * 5.0 + position.z * 4.0) * 0.05 * uWind;
          transformed.z += wave * hem;
          transformed.x += cos(uTime * 2.1 + position.y * 4.0) * 0.025 * uWind * hem;`,
        );
      if (isHaori) {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vClothPos;",
          )
          .replace(
            "#include <color_fragment>",
            `#include <color_fragment>
            float nearHem = smoothstep(0.24, 0.21, vClothPos.y) * smoothstep(0.04, 0.07, vClothPos.y);
            float ang = atan(vClothPos.x, vClothPos.z);
            float diamond = smoothstep(0.14, 0.08, abs(fract(ang * 2.55) - 0.5) + abs(vClothPos.y - 0.14) * 2.2);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.03, 0.035, 0.05), nearHem * diamond);`,
          );
      }
    };
    return mat;
  };

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x090b12,
    roughness: 0.9,
    envMapIntensity: 0.16,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdfb8a6,
    roughness: 0.68,
    envMapIntensity: 0.18,
  });
  const haoriMat = makeClothMaterial(0xc0c8d8, true);
  const scarfMat = makeClothMaterial(0xd2daea, false);
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd9af54,
    metalness: 0.85,
    roughness: 0.26,
    envMapIntensity: 0.72,
  });

  // Hakama pleated skirt (tapered gracefully)
  const hakamaGeo = new THREE.CylinderGeometry(0.16, 0.3, 0.98, 16, 6, false);
  hakamaGeo.translate(0, 0.49, 0);
  root.add(new THREE.Mesh(hakamaGeo, darkMat));

  // Shihakusho torso + white obi sash
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.175, 0.15, 0.52, 12),
    darkMat,
  );
  torso.scale.set(1.12, 1.0, 0.78);
  torso.position.y = 1.21;
  root.add(torso);

  const obi = new THREE.Mesh(
    new THREE.CylinderGeometry(0.165, 0.165, 0.085, 12),
    scarfMat,
  );
  obi.scale.set(1.12, 1.0, 0.8);
  obi.position.y = 0.99;
  root.add(obi);

  // White Inner Kimono V-Collar (Eri)
  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.26, 0.045),
      scarfMat,
    );
    lapel.position.set(side * 0.055, 1.4, 0.115);
    lapel.rotation.z = side * -0.34;
    root.add(lapel);
  }

  // Broad Shoulders + Hanging Rectangular Kimono Tamoto Sleeves (transforms silhouette)
  const shoulderBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.14, 0.22),
    haoriMat,
  );
  shoulderBar.position.set(0, 1.42, -0.02);
  root.add(shoulderBar);

  for (const side of [-1, 1]) {
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.54, 0.26),
      haoriMat,
    );
    sleeve.position.set(side * 0.27, 1.19, -0.02);
    sleeve.rotation.z = side * 0.09;
    root.add(sleeve);

    const innerSleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.5, 0.22),
      darkMat,
    );
    innerSleeve.position.set(side * 0.25, 1.18, 0.0);
    innerSleeve.rotation.z = side * 0.09;
    root.add(innerSleeve);
  }

  // Flowing Open Captain Haori Coat draped behind & around waist
  const haoriGeo = new THREE.CylinderGeometry(
    0.21,
    0.38,
    1.36,
    22,
    12,
    true,
    0.56,
    Math.PI * 1.62,
  );
  haoriGeo.translate(0, 0.72, 0);
  const haori = new THREE.Mesh(haoriGeo, haoriMat);
  haori.rotation.y = Math.PI * 0.19;
  root.add(haori);

  // Visible Neck + Refined Face & Raven Hair + Framing Cheek Locks
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.062, 0.16, 10),
    skinMat,
  );
  neck.position.y = 1.54;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.118, 18, 16), skinMat);
  head.scale.set(0.84, 1.12, 0.92);
  head.position.y = 1.69;
  root.add(head);

  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.126, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    darkMat,
  );
  hairCrown.position.set(0, 1.7, -0.01);
  root.add(hairCrown);

  // Signature center bangs lock + left/right framing cheek strands
  const centerLock = new THREE.Mesh(
    new THREE.ConeGeometry(0.024, 0.22, 5),
    darkMat,
  );
  centerLock.position.set(0.015, 1.66, 0.112);
  centerLock.rotation.z = -0.22;
  centerLock.rotation.x = 0.08;
  root.add(centerLock);

  for (const side of [-1, 1]) {
    const cheekLock = new THREE.Mesh(
      new THREE.ConeGeometry(0.026, 0.28, 5),
      darkMat,
    );
    cheekLock.position.set(side * 0.088, 1.6, 0.065);
    cheekLock.rotation.z = side * -0.08;
    root.add(cheekLock);
  }

  const backHairGeo = new THREE.ConeGeometry(0.17, 0.56, 8);
  backHairGeo.translate(0, 1.45, -0.1);
  root.add(new THREE.Mesh(backHairGeo, darkMat));

  // Articulated Right Arm + Hakuteiken Sword
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.24, 1.44, 0.02);
  const armMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.04, 0.48, 8),
    darkMat,
  );
  armMesh.position.y = -0.22;
  rightArmPivot.add(armMesh);

  const hakuteiGroup = new THREE.Group();
  hakuteiGroup.position.set(0, -0.45, 0.05);
  hakuteiGroup.rotation.x = Math.PI * 0.42;
  const whiteBladeMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.38, 1.45, 1.65),
  });
  const hBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.024, 1.35, 0.06),
    whiteBladeMat,
  );
  hBlade.position.y = 0.65;
  hakuteiGroup.add(hBlade);
  hakuteiGroup.visible = false;
  rightArmPivot.add(hakuteiGroup);
  root.add(rightArmPivot);

  // Classic Regalia: Flat Silk Ribbon Ginranpū Scarf seated at collarbone (y = 1.45) + Kenseikan
  const classicGroup = new THREE.Group();
  const collarWrap = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.028, 8, 22),
    scarfMat,
  );
  collarWrap.rotation.x = Math.PI * 0.48;
  collarWrap.position.y = 1.47;
  classicGroup.add(collarWrap);

  const scarfTail = buildFlatSilkScarf(scarfMat);
  classicGroup.add(scarfTail);

  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xd8e0ef,
    metalness: 0.5,
    roughness: 0.3,
  });
  for (let i = -1; i <= 1; i++) {
    const pin = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.072, 0.028),
      pinMat,
    );
    pin.position.set(i * 0.046, 1.83, 0.01);
    classicGroup.add(pin);
  }
  const sidePin = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.028, 0.026),
    pinMat,
  );
  sidePin.position.set(0.095, 1.76, 0.04);
  classicGroup.add(sidePin);
  root.add(classicGroup);

  // Royal Palace Ōken Regalia (Acts VI-VII)
  const royalGroup = new THREE.Group();
  const highCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.22,
      0.17,
      0.2,
      16,
      1,
      true,
      0.45,
      Math.PI * 1.68,
    ),
    scarfMat,
  );
  highCollar.rotation.y = Math.PI * 0.16;
  highCollar.position.y = 1.56;
  royalGroup.add(highCollar);

  const goldRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.011, 6, 20, Math.PI * 1.68),
    goldTrimMat,
  );
  goldRim.rotation.x = Math.PI * 0.5;
  goldRim.rotation.z = Math.PI * 0.34;
  goldRim.position.y = 1.66;
  royalGroup.add(goldRim);

  const headWrap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.126, 0.126, 0.088, 16),
    scarfMat,
  );
  headWrap.position.y = 1.76;
  royalGroup.add(headWrap);
  royalGroup.visible = false;
  root.add(royalGroup);

  // Drop Katana with authentic hollow 4-pane window Tsuba
  const dropSword = createDropKatana();
  root.add(dropSword);

  return {
    root,
    dropSword,
    update(t, time, reducedMotion) {
      clothUniforms.uTime.value = reducedMotion ? 0 : time;
      clothUniforms.uWind.value = t > 0.2 && t < 0.48 ? 1.85 : 1.0;

      const isRoyal = t >= 0.8;
      classicGroup.visible = !isRoyal;
      royalGroup.visible = isRoyal;

      dropSword.visible = t < 0.135;
      if (dropSword.visible) {
        const dropP = Math.max(0, Math.min(1, (t - 0.075) / 0.055));
        const easeDrop = dropP * dropP * dropP;
        dropSword.position.set(0.0, 1.38 - easeDrop * 2.4, 0.56);
      }

      hakuteiGroup.visible = t >= 0.65 && t < 0.8;

      let armPitch = 0.05;
      let armRoll = -0.12;
      if (t >= 0.24 && t < 0.36) {
        armPitch = -1.25;
        armRoll = 0.25;
      } else if (t >= 0.65 && t < 0.8) {
        armPitch = -0.95;
        armRoll = 0.15;
      } else if (t >= 0.905) {
        armPitch = -1.35;
        armRoll = 0.05;
      }
      rightArmPivot.rotation.x += (armPitch - rightArmPivot.rotation.x) * 0.12;
      rightArmPivot.rotation.z += (armRoll - rightArmPivot.rotation.z) * 0.12;
    },
  };
}

function buildFlatSilkScarf(material) {
  const segs = 16;
  const pos = [];
  const idx = [];
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.11, 1.46, 0.03),
    new THREE.Vector3(0.32, 1.42, -0.14),
    new THREE.Vector3(0.58, 1.32, -0.34),
    new THREE.Vector3(0.86, 1.36, -0.58),
    new THREE.Vector3(1.1, 1.28, -0.78),
  ]);

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = curve.getPoint(u);
    const halfW = 0.058 * (1.0 - u * 0.45);
    pos.push(p.x, p.y + halfW, p.z);
    pos.push(p.x, p.y - halfW, p.z);
  }
  for (let i = 0; i < segs; i++) {
    const r0 = i * 2;
    const r1 = (i + 1) * 2;
    idx.push(r0, r1, r1 + 1, r0, r1 + 1, r0 + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function createDropKatana() {
  const grp = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x8fa0bd,
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 0.72,
  });
  const tsubaMat = new THREE.MeshStandardMaterial({
    color: 0xb58e42,
    metalness: 0.85,
    roughness: 0.3,
  });
  const hiltMat = new THREE.MeshStandardMaterial({
    color: 0x5c4282,
    roughness: 0.68,
  });

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 1.05, 0.052),
    bladeMat,
  );
  blade.position.y = -0.52;
  grp.add(blade);

  // Authentic Hollow 4-Pane Window Tsuba (perimeter frame + interior crossbars)
  const w = 0.15;
  const d = 0.11;
  const bar = 0.016;
  const h = 0.018;
  const tsubaParts = [
    [w, h, bar, 0, 0, d * 0.5],
    [w, h, bar, 0, 0, -d * 0.5],
    [bar, h, d, w * 0.5, 0, 0],
    [bar, h, d, -w * 0.5, 0, 0],
    [w, h, bar * 0.75, 0, 0, 0],
    [bar * 0.75, h, d, 0, 0, 0],
  ];
  for (const [sx, sy, sz, px, py, pz] of tsubaParts) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), tsubaMat);
    p.position.set(px, py, pz);
    grp.add(p);
  }

  const hilt = new THREE.Mesh(
    new THREE.BoxGeometry(0.032, 0.34, 0.046),
    hiltMat,
  );
  hilt.position.y = 0.18;
  grp.add(hilt);

  return grp;
}
