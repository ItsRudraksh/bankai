import "./styles/main.css";
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { ACTS } from "./data/acts.js";
import { SenbonAudio } from "./audio/soundscape.js";
import { CinematicShader } from "./shaders/cinematicPass.js";
import { createWaterRippleOverlay } from "./shaders/waterRippleShader.js";
import { createByakuyaRig } from "./scene/byakuyaRig.js";
import { createColonnadeSystem } from "./scene/colonnadeSystem.js";
import { createPetalSystem } from "./scene/petalSystem.js";
import { createSenkeiSystem } from "./scene/senkeiSystem.js";
import { createHakuteikenSystem } from "./scene/hakuteikenSystem.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
const smoothstep = (a, b, v) => {
  const x = invLerp(a, b, v);
  return x * x * (3 - 2 * x);
};

const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let prefersReducedMotion = reduceQuery.matches;
reduceQuery.addEventListener("change", (e) => {
  prefersReducedMotion = e.matches;
});

const mount = document.getElementById("webgl-mount");
const bootCurtain = document.getElementById("boot-curtain");
const track = document.getElementById("scroll-track");
const gestureHint = document.getElementById("gesture-hint");
const tategakiEl = document.getElementById("tategaki-title");
const formTagEl = document.getElementById("form-tag");
const subJpEl = document.getElementById("subtitle-jp");
const subEnEl = document.getElementById("subtitle-en");
const scrollHintEl = document.getElementById("scroll-hint");
const actJpEl = document.getElementById("act-jp");
const actNameEl = document.getElementById("act-name");
const scrollPctEl = document.getElementById("scroll-pct");
const playBtn = document.getElementById("play-btn");
const playIcon = document.getElementById("play-icon");
const playLabel = document.getElementById("play-label");
const soundBtn = document.getElementById("sound-btn");
const soundLabel = document.getElementById("sound-label");
const chapterRail = document.getElementById("chapter-rail");

function buildDarkBankaiEnvironment(renderer) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x03050c);

  const keyPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 22),
    new THREE.MeshBasicMaterial({ color: 0x869ec9, side: THREE.DoubleSide }),
  );
  keyPanel.position.set(14, 11, 11);
  keyPanel.lookAt(0, 0, 0);
  envScene.add(keyPanel);

  const sakuraPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 9),
    new THREE.MeshBasicMaterial({ color: 0xc93b88, side: THREE.DoubleSide }),
  );
  sakuraPanel.position.set(-14, 3, -8);
  sakuraPanel.lookAt(0, 0, 0);
  envScene.add(sakuraPanel);

  const rimPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 3.5),
    new THREE.MeshBasicMaterial({ color: 0x4b6094, side: THREE.DoubleSide }),
  );
  rimPanel.position.set(0, 18, -10);
  rimPanel.lookAt(0, 0, 0);
  envScene.add(rimPanel);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  return envTex;
}

let W = window.innerWidth;
let H = window.innerHeight;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(dpr);
renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050c);
scene.fog = new THREE.FogExp2(0x03050c, 0.024);
scene.environment = buildDarkBankaiEnvironment(renderer);

const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 140);
camera.position.set(0, 2.2, 6.2);

const keyLight = new THREE.DirectionalLight(0xcfe0ff, 1.45);
keyLight.position.set(6, 14, 9);
scene.add(keyLight);

const sakuraLight = new THREE.PointLight(0xff4da6, 2.1, 42, 1.6);
sakuraLight.position.set(0, 4.5, 2.5);
scene.add(sakuraLight);

const rimLight = new THREE.DirectionalLight(0x7c98d8, 1.0);
rimLight.position.set(-7, 6, -12);
scene.add(rimLight);

const portraitFill = new THREE.PointLight(0xdce6ff, 0.85, 6, 1.5);
portraitFill.position.set(0.35, 1.75, 1.45);
scene.add(portraitFill);

const reflector = new Reflector(new THREE.PlaneGeometry(160, 160), {
  clipBias: 0.003,
  textureWidth: Math.max(256, Math.floor(W * 0.5)),
  textureHeight: Math.max(256, Math.floor(H * 0.5)),
  color: 0x171f30,
});
reflector.rotation.x = -Math.PI * 0.5;
reflector.position.y = 0.0;
scene.add(reflector);

const waterOverlay = createWaterRippleOverlay();
scene.add(waterOverlay.mesh);

const byakuya = createByakuyaRig();
const colonnade = createColonnadeSystem();
const petals = createPetalSystem(2800);
const senkei = createSenkeiSystem();
const hakuteiken = createHakuteikenSystem();

scene.add(byakuya.root);
scene.add(colonnade.mesh);
scene.add(petals.group);
scene.add(senkei.mesh);
scene.add(hakuteiken.group);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.38, 1.18);
composer.addPass(bloomPass);

const cinematicPass = new ShaderPass(CinematicShader);
composer.addPass(cinematicPass);
composer.addPass(new OutputPass());

const CAMERA_TRACK = [
  { t: 0.0, pos: [0.0, 1.68, 2.65], look: [0.0, 1.44, 0.0], fov: 40 },
  { t: 0.09, pos: [0.0, 1.25, 3.25], look: [0.0, 0.65, 0.2], fov: 44 },
  { t: 0.16, pos: [0.0, 1.55, 7.8], look: [0.0, 3.8, -14], fov: 50 },
  { t: 0.28, pos: [2.8, 2.6, 9.2], look: [0.0, 2.6, -2.0], fov: 52 },
  { t: 0.42, pos: [0.0, 3.2, 14.5], look: [0.0, 3.0, 0.0], fov: 48 },
  { t: 0.49, pos: [0.0, 2.2, 11.2], look: [0.0, 3.8, 0.0], fov: 50 },
  { t: 0.59, pos: [4.8, 1.55, 6.4], look: [0.0, 4.4, -1.5], fov: 56 },
  { t: 0.71, pos: [0.0, 2.2, 9.8], look: [0.0, 2.1, 0.0], fov: 48 },
  { t: 0.85, pos: [-2.4, 1.85, 10.6], look: [0.0, 4.2, -12], fov: 52 },
  { t: 0.95, pos: [0.0, 2.6, 12.6], look: [0.0, 2.4, -1.5], fov: 50 },
  { t: 1.0, pos: [0.0, 1.85, 6.4], look: [0.0, 1.8, 0.0], fov: 44 },
];

const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();

function evaluateCamera(t, pointer) {
  let k0 = CAMERA_TRACK[0];
  let k1 = CAMERA_TRACK[CAMERA_TRACK.length - 1];
  for (let i = 0; i < CAMERA_TRACK.length - 1; i++) {
    if (t >= CAMERA_TRACK[i].t && t <= CAMERA_TRACK[i + 1].t) {
      k0 = CAMERA_TRACK[i];
      k1 = CAMERA_TRACK[i + 1];
      break;
    }
  }
  const f = smoothstep(k0.t, k1.t, t);
  camPos.set(
    lerp(k0.pos[0], k1.pos[0], f) + pointer.x * 0.45,
    lerp(k0.pos[1], k1.pos[1], f) - pointer.y * 0.25,
    lerp(k0.pos[2], k1.pos[2], f),
  );
  camLook.set(
    lerp(k0.look[0], k1.look[0], f),
    lerp(k0.look[1], k1.look[1], f),
    lerp(k0.look[2], k1.look[2], f),
  );

  const aspectFactor = W < H ? clamp(1.18 - (W / H) * 0.25, 1.0, 1.25) : 1.0;
  const targetFov = lerp(k0.fov, k1.fov, f) * aspectFactor;
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

const chapterBtns = ACTS.map((act, index) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chapter-btn";
  btn.dataset.active = index === 0 ? "true" : "false";
  btn.setAttribute("aria-label", `Jump to ${act.name}`);
  btn.innerHTML = `<span class="chapter-name">${act.name}</span><span class="chapter-pip" aria-hidden="true"></span>`;
  btn.addEventListener("click", () => {
    stopAutoPlay();
    const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
    const targetT =
      index === 0 ? 0 : Math.min(0.995, act.t + (act.end - act.t) * 0.42);
    window.scrollTo({
      top: targetT * maxScroll,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
  chapterRail.appendChild(btn);
  return btn;
});

const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
const isFinePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)",
).matches;
if (isFinePointer) {
  window.addEventListener(
    "pointermove",
    (e) => {
      if (prefersReducedMotion) return;
      pointer.tx = (e.clientX / Math.max(1, W) - 0.5) * 2;
      pointer.ty = (e.clientY / Math.max(1, H) - 0.5) * 2;
    },
    { passive: true },
  );
}

const audio = new SenbonAudio();
soundBtn.addEventListener("click", () => {
  const on = audio.toggle();
  soundBtn.setAttribute("aria-pressed", String(on));
  soundLabel.textContent = on ? "Sound On" : "Sound Off";
  if (on) audio.playActCue(Math.max(0, activeActIdx));
});

let isAutoPlaying = false;
let lastAutoTime = 0;

function stopAutoPlay() {
  if (!isAutoPlaying) return;
  isAutoPlaying = false;
  playBtn.dataset.playing = "false";
  playIcon.textContent = "▶";
  playLabel.textContent = "Auto-Play";
}

playBtn.addEventListener("click", () => {
  if (isAutoPlaying) {
    stopAutoPlay();
    return;
  }
  const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
  if (window.scrollY >= maxScroll - 8) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  isAutoPlaying = true;
  lastAutoTime = performance.now();
  playBtn.dataset.playing = "true";
  playIcon.textContent = "❚❚";
  playLabel.textContent = "Playing";
});

window.addEventListener("wheel", stopAutoPlay, { passive: true });
window.addEventListener("touchstart", stopAutoPlay, { passive: true });

let targetT = 0;
let smoothT = 0;
let activeActIdx = -1;
let lastPctText = "";

function readScroll() {
  const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
  targetT = clamp(window.scrollY / maxScroll, 0, 1);
}
window.addEventListener("scroll", readScroll, { passive: true });

window.addEventListener("resize", () => {
  W = window.innerWidth;
  H = window.innerHeight;
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  composer.setSize(W, H);
  bloomPass.resolution.set(W, H);
  reflector
    .getRenderTarget()
    .setSize(
      Math.max(256, Math.floor(W * 0.5)),
      Math.max(256, Math.floor(H * 0.5)),
    );
});

function updateHUD(t) {
  let idx = 0;
  for (let i = 0; i < ACTS.length; i++) {
    if (t >= ACTS[i].t) idx = i;
  }

  const act = ACTS[idx];
  if (idx !== activeActIdx) {
    if (activeActIdx !== -1) audio.playActCue(idx);
    activeActIdx = idx;

    actJpEl.textContent = act.jp;
    actNameEl.textContent = act.name;
    tategakiEl.textContent = act.tategaki;
    formTagEl.textContent = act.tag;
    subJpEl.textContent = act.subJP;
    subEnEl.textContent = act.subEN;

    chapterBtns.forEach((btn, i) => {
      btn.dataset.active = i === idx ? "true" : "false";
    });

    if (isFinePointer && !prefersReducedMotion && act.id === "scatter") {
      gestureHint.classList.add("is-visible");
    } else {
      gestureHint.classList.remove("is-visible");
    }

    tategakiEl.classList.remove("is-visible");
    formTagEl.classList.remove("is-visible");
    subJpEl.classList.remove("is-visible");
    subEnEl.classList.remove("is-visible");
    requestAnimationFrame(() => {
      tategakiEl.classList.add("is-visible");
      formTagEl.classList.add("is-visible");
      subJpEl.classList.add("is-visible");
      subEnEl.classList.add("is-visible");
    });
  }

  const pct = `${Math.round(t * 100)}%`;
  if (pct !== lastPctText) {
    lastPctText = pct;
    scrollPctEl.textContent = pct;
  }

  if (t > 0.025) scrollHintEl.classList.add("is-hidden");
  else scrollHintEl.classList.remove("is-hidden");
}

const colVoid = new THREE.Color(0x03050c);
const colSakura = new THREE.Color(0x09030c);
const colAsh = new THREE.Color(0x140307);
const colRoyal = new THREE.Color(0x040712);
const tmpBg = new THREE.Color();

let booted = false;

function animate(now) {
  requestAnimationFrame(animate);
  const time = now * 0.001;

  if (isAutoPlaying) {
    const dt = Math.min(0.05, (now - lastAutoTime) * 0.001);
    lastAutoTime = now;
    const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: window.scrollY + dt * 0.028 * maxScroll,
      behavior: "auto",
    });
    readScroll();
    if (targetT >= 0.999) stopAutoPlay();
  }

  const damp = prefersReducedMotion ? 1.0 : 0.12;
  smoothT += (targetT - smoothT) * damp;
  if (Math.abs(targetT - smoothT) < 0.00015) smoothT = targetT;

  pointer.x += (pointer.tx - pointer.x) * 0.08;
  pointer.y += (pointer.ty - pointer.y) * 0.08;

  const t = smoothT;

  if (t < 0.21) {
    tmpBg.copy(colVoid);
  } else if (t < 0.65) {
    const w = smoothstep(0.21, 0.3, t) * (1 - smoothstep(0.6, 0.66, t));
    tmpBg.copy(colVoid).lerp(colSakura, w);
  } else if (t < 0.85) {
    const ashW = smoothstep(0.79, 0.82, t) * (1 - smoothstep(0.83, 0.87, t));
    tmpBg.copy(colVoid).lerp(colAsh, ashW);
  } else {
    tmpBg.copy(colRoyal);
  }
  scene.background.copy(tmpBg);
  scene.fog.color.copy(tmpBg);

  const sakuraActive =
    smoothstep(0.2, 0.28, t) * (1 - smoothstep(0.64, 0.67, t)) +
    smoothstep(0.9, 0.95, t);
  sakuraLight.intensity = lerp(0.4, 2.2, clamp(sakuraActive, 0, 1));
  bloomPass.strength = t >= 0.65 && t <= 0.8 ? 0.34 : 0.28;

  waterOverlay.uniforms.uTime.value = prefersReducedMotion ? 0 : time;
  waterOverlay.uniforms.uDropRipple.value = invLerp(0.105, 0.195, t);
  waterOverlay.uniforms.uSakuraTint.value = clamp(sakuraActive, 0, 1);

  const hakSlashPeak = Math.sin(invLerp(0.75, 0.79, t) * Math.PI);
  const gokeiBlastPeak = Math.sin(invLerp(0.46, 0.49, t) * Math.PI);
  const ikkaFlash = Math.sin(invLerp(0.96, 0.985, t) * Math.PI);
  const impact = Math.max(
    hakSlashPeak * 0.35,
    gokeiBlastPeak * 0.24,
    ikkaFlash * 0.28,
  );

  cinematicPass.uniforms.uTime.value = prefersReducedMotion ? 0 : time;
  cinematicPass.uniforms.uFlash.value = prefersReducedMotion ? 0 : impact;
  cinematicPass.uniforms.uChromatic.value = prefersReducedMotion
    ? 0
    : 0.0012 + impact * 0.004;

  evaluateCamera(t, prefersReducedMotion ? { x: 0, y: 0 } : pointer);
  byakuya.update(t, time, prefersReducedMotion);
  colonnade.update(t, time);
  petals.update(t, time, pointer, prefersReducedMotion);
  senkei.update(t, time, prefersReducedMotion);
  hakuteiken.update(t, time, prefersReducedMotion);

  updateHUD(t);
  composer.render();

  if (!booted) {
    booted = true;
    bootCurtain.classList.add("is-done");
  }
}

readScroll();
smoothT = targetT;
requestAnimationFrame(animate);
