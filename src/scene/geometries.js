import * as THREE from "three";

/**
 * Multi-faceted 3D beveled Giant Bankai Blade (height normalized y = 0..1)
 * with spine ridge (shinogi), razor edge (ha), back (mune), and curved kissaki tip.
 */
export function createGiantBladeGeometry() {
  const segsY = 18;
  const positions = [];
  const uvs = [];
  const indices = [];

  // Cross-section profile (diamond-beveled katana cross section)
  // 0: back spine (mune), 1: right ridge, 2: front razor edge (ha), 3: left ridge
  const ringProfile = (y) => {
    // Taper width & curve spine forward at kissaki tip (y > 0.78)
    const tipT = Math.max(0, (y - 0.78) / 0.22);
    const widthScale = Math.max(0.02, 1.0 - Math.pow(tipT, 1.55));
    const curveZ = Math.pow(tipT, 2.0) * 0.42;
    const hw = 0.045 * widthScale; // thickness
    const depth = 0.58 * widthScale; // edge-to-spine chord

    return [
      [0, y, -depth * 0.55 + curveZ], // back mune
      [hw, y, -depth * 0.06 + curveZ * 0.5], // right shinogi ridge
      [0, y, depth * 0.5 + curveZ * 0.15], // razor edge ha
      [-hw, y, -depth * 0.06 + curveZ * 0.5], // left shinogi ridge
    ];
  };

  for (let iy = 0; iy <= segsY; iy++) {
    const y = iy / segsY;
    const ring = ringProfile(y);
    for (let k = 0; k < 4; k++) {
      positions.push(ring[k][0], ring[k][1], ring[k][2]);
      uvs.push(k / 4, y);
    }
  }

  for (let iy = 0; iy < segsY; iy++) {
    const row = iy * 4;
    const nextRow = (iy + 1) * 4;
    for (let k = 0; k < 4; k++) {
      const kNext = (k + 1) % 4;
      const a = row + k;
      const b = row + kNext;
      const c = nextRow + kNext;
      const d = nextRow + k;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Forged single-piece 3D Katana with vertex colors separating:
 * - Steel/sakura blade (r > 0.8 -> receives HDR plasma edge bloom)
 * - Antique bronze 4-pane tsuba crossguard
 * - Deep lavender wrapped tsuka hilt
 */
export function createSenkeiKatanaGeometry() {
  const parts = [];

  const pushBox = (sx, sy, sz, ox, oy, oz, r, g, b) => {
    const box = new THREE.BoxGeometry(sx, sy, sz, 1, 6, 1);
    const pos = box.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      // Subtle katana curve (sori) along blade length
      const ly = pos.getY(i) + oy;
      if (oy > -0.3) {
        const taper = Math.max(0.08, 1.0 - Math.max(0, (ly - 0.72) / 0.45));
        pos.setZ(
          i,
          pos.getZ(i) * taper + Math.pow(Math.max(0, ly), 2.0) * 0.032,
        );
      }
      pos.setX(i, pos.getX(i) + ox);
      pos.setY(i, ly);
      pos.setZ(i, pos.getZ(i) + oz);
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    box.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    box.computeVertexNormals();
    parts.push(box);
  };

  // Blade shaft (centered around y = -0.35 .. +1.15) -> high R channel marks glowing edge
  pushBox(0.028, 1.55, 0.082, 0, 0.35, 0, 1.0, 0.85, 0.94);

  // 4-Pane Open Frame Tsuba Crossguard (y = -0.43)
  pushBox(0.14, 0.025, 0.2, 0, -0.43, 0, 0.48, 0.36, 0.16);

  // Lavender Tsuka-ito Hilt (y = -0.44 .. -0.92)
  pushBox(0.044, 0.46, 0.062, 0, -0.68, 0, 0.24, 0.16, 0.38);

  return mergeColoredGeometries(parts);
}

/**
 * Cupped 3D Cherry-Blossom Razor Shard (notched tip + V-crease so specular glints catch facets)
 */
export function createCurvedPetalGeometry() {
  // 7 vertices forming a cupped sakura petal blade
  const verts = new Float32Array([
    0.0,
    -0.14,
    0.012, // 0: stem base
    -0.075,
    -0.02,
    -0.015, // 1: left flank
    0.075,
    -0.02,
    -0.015, // 2: right flank
    0.0,
    0.02,
    0.024, // 3: raised center ridge
    -0.065,
    0.12,
    -0.01, // 4: left wing tip
    0.065,
    0.12,
    -0.01, // 5: right wing tip
    0.0,
    0.085,
    0.01, // 6: classic sakura notch
  ]);

  const indices = [0, 3, 1, 0, 2, 3, 1, 3, 4, 3, 2, 5, 3, 6, 4, 3, 5, 6];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Tapered curved feather plume blade for Shūkei: Hakuteiken
 */
export function createFeatherPlumeGeometry() {
  const segs = 12;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = u;
    const width =
      Math.sin(Math.pow(u, 0.72) * Math.PI) * 0.13 + (1 - u) * 0.025;
    const archY = Math.sin(u * Math.PI * 0.8) * 0.14;
    const curlZ = -Math.pow(u, 2.0) * 0.16;

    positions.push(x, archY + width, curlZ);
    positions.push(x, archY, curlZ + 0.025);
    positions.push(x, archY - width, curlZ);

    uvs.push(u, 1, u, 0.5, u, 0);
  }

  for (let i = 0; i < segs; i++) {
    const r0 = i * 3;
    const r1 = (i + 1) * 3;
    indices.push(r0, r1, r1 + 1, r0, r1 + 1, r0 + 1);
    indices.push(r0 + 1, r1 + 1, r1 + 2, r0 + 1, r1 + 2, r0 + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function mergeColoredGeometries(geometries) {
  let totalVerts = 0;
  let totalIdx = 0;
  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    totalIdx += g.index ? g.index.count : g.attributes.position.count;
  }

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const col = new Float32Array(totalVerts * 3);
  const idx = new Uint32Array(totalIdx);

  let vOffset = 0;
  let iOffset = 0;
  for (const g of geometries) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    const c = g.attributes.color.array;
    pos.set(p, vOffset * 3);
    norm.set(n, vOffset * 3);
    col.set(c, vOffset * 3);

    if (g.index) {
      const gi = g.index.array;
      for (let k = 0; k < gi.length; k++) idx[iOffset + k] = gi[k] + vOffset;
      iOffset += gi.length;
    }
    vOffset += g.attributes.position.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(norm, 3));
  merged.setAttribute("color", new THREE.BufferAttribute(col, 3));
  merged.setIndex(new THREE.BufferAttribute(idx, 1));
  return merged;
}
