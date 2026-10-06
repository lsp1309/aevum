import * as THREE from "three";
import { onFrame, clamp, smooth, lerp, rng } from "../core/clock";
import { T } from "./timing";
import { W, H, $ } from "../remix/stage";
import { RING_A, RING_B, RING_W, RING_TILT } from "../core/icons";

/**
 * The 3D world of "Astrya takes control", a pure function of time:
 *   chaos   — a void; one email, two, ten, hundreds; the freeze; the core;
 *             the wave; understand → organize → act; the cards land in the inbox
 *   galaxy  — one email, then the inbox, then hundreds of messages, all wired
 *             to the Astrya core; the camera circles it and dives in
 *   calm    — deep blue space, a few drifting particles, for the app and the end
 */
const ease = {
  in3: (x: number) => x * x * x,
  out3: (x: number) => 1 - Math.pow(1 - x, 3),
  io3: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out5: (x: number) => 1 - Math.pow(1 - x, 5),
  io5: (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
};
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

const NOISE = `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; } return v; }
`;

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const glowTex = (rgb = "120,180,255") =>
  canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.2, `rgba(${rgb},0.45)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });

function stars(n: number, r: number, seed: number, size = 1.6) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3);
  const sz = new Float32Array(n);
  const tw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
    sz[i] = 0.6 + Math.pow(R(), 6) * 4.5;
    tw[i] = R() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
  g.setAttribute("aTw", new THREE.BufferAttribute(tw, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: `attribute float aSize; attribute float aTw; uniform float uT; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        vA = 0.65 + 0.35 * sin(uT * 2.0 + aTw); gl_PointSize = aSize * ${size.toFixed(2)}; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.78, 0.86, 1.0) * a * vA * uA, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { pts: new THREE.Points(g, m), mat: m };
}

/** Floating dust: soft points drifting through a box (deterministic). */
function dust(n: number, box: number, seed: number) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3);
  const ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos.set([(R() - 0.5) * box, (R() - 0.5) * box * 0.6, (R() - 0.5) * box], i * 3);
    ph[i] = R() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: `attribute float aPh; uniform float uT; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uT * 0.2 + aPh) * 30.0, cos(uT * 0.17 + aPh * 1.3) * 25.0 + uT * 6.0, sin(uT * 0.13 + aPh * 0.7) * 30.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        vA = 0.4 + 0.6 * fract(aPh); gl_PointSize = clamp(2600.0 / -mv.z, 1.0, 9.0); }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * a * vA * uA * 0.7, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { pts: new THREE.Points(g, m), mat: m };
}

// ── the cards ────────────────────────────────────────────────────────────
/** Category: 0 priority · 1 needs a reply · 2 can wait · 3 noise */
export const MSGS: Array<{ ini: string; who: string; what: string; cat: number; chip?: string }> = [
  { ini: "EB", who: "Eva Brunner · Alpine Supplies", what: "Contract renewal — confirmation needed", cat: 0, chip: "Due Friday" },
  { ini: "MD", who: "Marc Dufour · Silo Logistics", what: "Invoice 4821 — payment status", cat: 0, chip: "Overdue" },
  { ini: "NK", who: "Nina Kovacs · Atlas Freight", what: "Shipment AT-8891 delayed", cat: 0, chip: "Urgent" },
  { ini: "SM", who: "Sofia Marin · Chat", what: "Can you send me the Q4 numbers?", cat: 1, chip: "Reply needed" },
  { ini: "PS", who: "Priya Shah · Finance", what: "Re: Q4 budget — final numbers?", cat: 1, chip: "Reply needed" },
  { ini: "HK", who: "Helena Krug · Lumen Labs", what: "NDA — Lumen Labs engagement", cat: 1, chip: "Signature" },
  { ini: "CO", who: "Claire Osman · Northline", what: "Proposal v3 — waiting on your board", cat: 1, chip: "Reply needed" },
  { ini: "NK", who: "Northline kickoff", what: "Thursday 14:30 · Missed", cat: 1, chip: "Missed" },
  { ini: "XL", who: "Q4 allocation.xlsx", what: "For Priya Shah · Needed by Friday", cat: 1, chip: "Requested" },
  { ini: "JF", who: "Jonas Frei · Clearwater Bank", what: "Updated bank details", cat: 2 },
  { ini: "SP", who: "Silo Pay", what: "Payment received — INV-4820", cat: 2 },
  { ini: "AF", who: "Atlas Freight", what: "AT-8891 — tracking update", cat: 2 },
  { ini: "MC", who: "Maya Chen · People Ops", what: "Expense report reminder", cat: 2 },
  { ini: "HL", who: "Helios Legal", what: "September legal brief", cat: 2 },
  { ini: "NR", who: "Northline Retail", what: "Product newsletter — October", cat: 3, chip: "Newsletter" },
  { ini: "WD", who: "Weekly digest", what: "12 stories you missed this week", cat: 3, chip: "Newsletter" },
  { ini: "WB", who: "Webinar invitation", what: "Q4 trends — save your seat", cat: 3, chip: "Promo" },
  { ini: "3+", who: "3 new notifications", what: "Comments, mentions and likes", cat: 3, chip: "Notification" },
  { ini: "OS", who: "Order shipped", what: "Your order is on its way", cat: 3, chip: "Notification" },
  { ini: "RM", who: "Reminder", what: "Timesheet due tomorrow", cat: 3, chip: "Reminder" },
];
const TW = 512;
const TH = 150;
const COLS = 4;
function atlas() {
  return canvasTex(2048, 2048, (g) => {
    for (let i = 0; i < 52; i++) {
      const m = MSGS[i % MSGS.length];
      const x = (i % COLS) * TW;
      const y = Math.floor(i / COLS) * TH;
      const noise = m.cat === 3;
      const gr = g.createLinearGradient(0, y, 0, y + TH);
      gr.addColorStop(0, noise ? "#121a33" : "#18244a");
      gr.addColorStop(1, noise ? "#0b1126" : "#0d1533");
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(x + 4, y + 4, TW - 8, TH - 8, 20);
      g.fill();
      g.strokeStyle = m.cat === 0 ? "rgba(190,220,255,0.75)" : "rgba(150,185,255,0.3)";
      g.lineWidth = m.cat === 0 ? 3 : 2;
      g.stroke();
      if (m.cat === 0) {
        g.fillStyle = "#9fd0ff";
        g.fillRect(x + 4, y + 30, 6, TH - 68);
      }
      g.fillStyle = noise ? "#26355e" : "#2f5fe0";
      g.beginPath();
      g.arc(x + 52, y + 75, 27, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#eef4ff";
      g.font = "700 19px Manrope Variable, sans-serif";
      g.textAlign = "center";
      g.fillText(m.ini, x + 52, y + 82);
      g.textAlign = "left";
      g.font = "700 24px Manrope Variable, sans-serif";
      g.fillStyle = "#ffffff";
      g.fillText(m.who, x + 96, y + 62, 300);
      g.fillStyle = "rgba(200,216,245,0.75)";
      g.font = "500 21px Manrope Variable, sans-serif";
      g.fillText(m.what, x + 96, y + 96, 390);
      g.fillStyle = "rgba(170,190,230,0.55)";
      g.font = "500 17px Manrope Variable, sans-serif";
      g.fillText(`09:${String(12 + ((i * 7) % 47)).padStart(2, "0")}`, x + TW - 70, y + 40);
      if (m.chip) {
        g.font = "700 16px Manrope Variable, sans-serif";
        const w = g.measureText(m.chip).width + 22;
        g.fillStyle = m.cat === 0 ? "#ffffff" : "rgba(120,160,255,0.22)";
        g.beginPath();
        g.roundRect(x + 96, y + 108, w, 28, 8);
        g.fill();
        g.fillStyle = m.cat === 0 ? "#0a1a4a" : "#cfe0ff";
        g.fillText(m.chip, x + 107, y + 128);
      }
      if (i < 26) {
        g.fillStyle = "#4d8dff";
        g.beginPath();
        g.arc(x + TW - 30, y + 34 + 30, 7, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}
const tileUV = (i: number) => [(i % COLS) * (TW / 2048), 1 - (Math.floor(i / COLS) + 1) * (TH / 2048)];

function cardMaterial(map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map }, uA: { value: 1 }, uDim: { value: 0 } },
    vertexShader: `attribute vec2 aUV; attribute float aFl; attribute float aCat; attribute float aA; varying vec2 vUv; varying vec2 vQ; varying float vFl; varying float vCat; varying float vA;
      void main(){ vUv = aUV + uv * vec2(${(TW / 2048).toFixed(5)}, ${(TH / 2048).toFixed(5)}); vQ = uv; vFl = aFl; vCat = aCat; vA = aA;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uA; uniform float uDim; varying vec2 vUv; varying vec2 vQ; varying float vFl; varying float vCat; varying float vA;
      void main(){ vec4 c = texture2D(uMap, vUv); if (c.a < 0.05 || vA < 0.01) discard;
        vec3 col = c.rgb * (1.0 - uDim * 0.85);
        // understood: a blue scan and a glowing edge; brighter for what matters
        float edge = smoothstep(0.035, 0.0, min(min(vQ.x, 1.0 - vQ.x) * 3.4, min(vQ.y, 1.0 - vQ.y)));
        vec3 tint = vCat < 0.5 ? vec3(0.85, 0.95, 1.0) : vCat < 1.5 ? vec3(0.4, 0.8, 1.0) : vCat < 2.5 ? vec3(0.3, 0.5, 0.95) : vec3(0.25, 0.32, 0.55);
        col += tint * vFl * (0.35 + edge * 1.4);
        gl_FragColor = vec4(col * uA * vA, c.a * uA * vA); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function ringMesh(color = 0xdff0ff) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, RING_A, RING_B, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, RING_A - RING_W, ((RING_A - RING_W) * RING_B) / RING_A, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 128), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.z = (RING_TILT * Math.PI) / 180;
  return m;
}

// ── chaos → order ────────────────────────────────────────────────────────
const RINGS = [
  { y: 330, r: 430 }, // priority
  { y: 20, r: 700 }, // needs a reply
  { y: -300, r: 980 }, // can wait
];
/** Where the cards land: the rows of the organized inbox (stage px → world at z = 0, camera at z = 1400, fov 40). */
const UPX = (2 * 1400 * Math.tan((20 * Math.PI) / 180)) / H;
const toWorld = (x: number, y: number) => new THREE.Vector3((x - W / 2) * UPX, -(y - H / 2) * UPX, 0);
export const ROWS_Y = [318, 436, 554, 672, 790];

function chaos(map: THREE.Texture) {
  const scene = new THREE.Scene();
  const N = 560;
  const R = rng(1248);
  const geo = new THREE.PlaneGeometry(340, 100);
  const aUV = new Float32Array(N * 2);
  const aFl = new Float32Array(N);
  const aCat = new Float32Array(N);
  const aA = new Float32Array(N);
  const card = Array.from({ length: N }, (_, i) => {
    // the first ones are the ones that matter; then everything
    const pick = [0, 1, 2, 3, 7, 8];
    const tile = i < 6 ? pick[i] : 3 + Math.floor(R() * 17) + 20 * Math.floor(R() * 2);
    const m = MSGS[tile % MSGS.length];
    aUV.set(tileUV(tile), i * 2);
    aCat[i] = m.cat;
    const birth = i === 0 ? T.first : i === 1 ? T.second : i < 12 ? T.ten + (i - 2) * 0.06 : T.flood + Math.pow((i - 12) / (N - 12), 0.55) * (T.stop - 0.4 - T.flood);
    const u = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dir = new THREE.Vector3(s * Math.cos(a), u * 0.75, s * Math.sin(a));
    const home = i === 0 ? new THREE.Vector3(0, 30, 0) : i === 1 ? new THREE.Vector3(-480, 190, -220) : dir.clone().multiplyScalar(220 + Math.pow(R(), 0.7) * 1500);
    return {
      tile,
      cat: m.cat,
      birth,
      home,
      from: i === 0 ? new THREE.Vector3(0, 30, -5200) : dir.clone().multiplyScalar(4200 + R() * 2000).add(new THREE.Vector3(0, (R() - 0.5) * 800, 0)),
      vel: new THREE.Vector3((R() - 0.5) * 60, (R() - 0.5) * 40, (R() - 0.5) * 60),
      spin: new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 2.4, (R() - 0.5) * 1.6),
      ph: R() * 6.28,
      ring: 0,
      slot: 0,
      lane: R(),
    };
  });
  // ring slots per category; the three that matter land first in the inbox
  const counts = [0, 0, 0];
  card.forEach((c) => {
    if (c.cat < 3) {
      c.ring = c.cat;
      c.slot = counts[c.cat]++;
    }
  });
  COUNTS.total = N;
  COUNTS.reply = counts[1];
  COUNTS.wait = counts[2];
  COUNTS.noise = card.filter((c) => c.cat === 3).length;
  geo.setAttribute("aUV", new THREE.InstancedBufferAttribute(aUV, 2));
  const flA = new THREE.InstancedBufferAttribute(aFl, 1);
  const aAA = new THREE.InstancedBufferAttribute(aA, 1);
  geo.setAttribute("aFl", flA);
  geo.setAttribute("aCat", new THREE.InstancedBufferAttribute(aCat, 1));
  geo.setAttribute("aA", aAA);
  const mat = cardMaterial(map);
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  scene.add(mesh);
  // the void: a floor of light lines, dust
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.ShaderMaterial({
      uniforms: { uA: { value: 1 }, uT: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uA; uniform float uT; varying vec3 vP;
        void main(){ vec2 g = abs(fract(vP.xz / 160.0) - 0.5); float l = smoothstep(0.015, 0.0, min(g.x, g.y));
          float d = length(vP.xz); float fade = exp(-d / 2600.0);
          float pulse = 0.5 + 0.5 * sin(d * 0.004 - uT * 1.5);
          gl_FragColor = vec4(vec3(0.2, 0.42, 1.0) * l * fade * (0.5 + 0.35 * pulse) * uA, 1.0); }`,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -700;
  scene.add(floor);
  const du = dust(1400, 5000, 9);
  scene.add(du.pts);
  const st = stars(3000, 9000, 4);
  scene.add(st.pts);
  // the core: a light, then the ring
  const core = new THREE.Group();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("110,170,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  const point = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("235,245,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  const ring = ringMesh();
  core.add(glow, point, ring);
  scene.add(core);
  // the wave: a shell and a ring of light
  const wave = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vNW; varying vec3 vPW; void main(){ vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vPW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uA; varying vec3 vNW; varying vec3 vPW; void main(){ vec3 V = normalize(cameraPosition - vPW); float r = 1.0 - abs(dot(normalize(vNW), V)); gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * pow(r, 3.0) * uA * 2.2, 1.0); }`,
    }),
  );
  scene.add(wave);
  const waveRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 160), new THREE.MeshBasicMaterial({ color: 0xa8d4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  waveRing.rotation.x = Math.PI / 2.15;
  scene.add(waveRing);
  // orbit guides for the three categories
  const guides = RINGS.map((rg) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(rg.r - 2, rg.r + 2, 200), new THREE.MeshBasicMaterial({ color: 0x7fb6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = rg.y;
    scene.add(m);
    return m;
  });
  // data lines: every card is wired to the core while it is understood
  const lpos = new Float32Array(N * 6);
  const lt = new Float32Array(N * 2);
  const lseed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    lt.set([0, 1], i * 2);
    lseed.set([R(), 0], i * 2);
    lseed[i * 2 + 1] = lseed[i * 2];
  }
  const lgeo = new THREE.BufferGeometry();
  const lposA = new THREE.BufferAttribute(lpos, 3);
  lgeo.setAttribute("position", lposA);
  lgeo.setAttribute("aT", new THREE.BufferAttribute(lt, 1));
  lgeo.setAttribute("aS", new THREE.BufferAttribute(lseed, 1));
  const lmat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uT: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT; attribute float aS; varying float vT; varying float vS; void main(){ vT = aT; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uA; uniform float uT; varying float vT; varying float vS;
      void main(){ float pulse = exp(-abs(fract(vT - uT * 0.9 - vS) - 0.5) * 18.0);
        gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * (0.12 + 0.18 * vT + pulse * 0.9) * uA, 1.0); }`,
  });
  const lines = new THREE.LineSegments(lgeo, lmat);
  lines.frustumCulled = false;
  scene.add(lines);
  // disintegration: each noise card bursts into particles
  const PN = 9000;
  const ppos = new Float32Array(PN * 3);
  const pdir = new Float32Array(PN * 3);
  const pown = new Float32Array(PN);
  const noiseIdx = card.map((c, i) => (c.cat === 3 ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k < PN; k++) {
    pown[k] = noiseIdx[k % noiseIdx.length];
    pdir.set([(R() - 0.5) * 2, (R() - 0.5) * 2 + 0.6, (R() - 0.5) * 2], k * 3);
    ppos.set([(R() - 0.5) * 340, (R() - 0.5) * 100, 0], k * 3);
  }
  const pgeo = new THREE.BufferGeometry();
  const pposA = new THREE.BufferAttribute(new Float32Array(PN * 3), 3);
  pgeo.setAttribute("position", pposA);
  const pmat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uA; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(3000.0 / -mv.z, 1.0, 5.0); }`,
    fragmentShader: `uniform float uA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.5, 0.75, 1.0) * smoothstep(0.5, 0.0, d) * uA, 1.0); }`,
  });
  const parts = new THREE.Points(pgeo, pmat);
  parts.frustumCulled = false;
  scene.add(parts);
  const cam = new THREE.PerspectiveCamera(40, W / H, 1, 30000);
  return { scene, cam, mesh, card, aFl, aA, flA, aAA, mat, N, floor, du, st, core, glow, point, ring, wave, waveRing, guides, lpos, lposA, lmat, ppos, pdir, pown, pposA, pmat, PN };
}

// ── the galaxy: everything wired to the core ─────────────────────────────
function emailTex() {
  // the hero card: Eva's email, as in the product
  return canvasTex(1100, 760, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 760);
    gr.addColorStop(0, "#16213f");
    gr.addColorStop(1, "#0d1531");
    g.fillStyle = gr;
    g.beginPath();
    g.roundRect(2, 2, 1096, 756, 30);
    g.fill();
    g.strokeStyle = "rgba(150,185,255,0.35)";
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = "rgba(170,190,230,0.6)";
    g.font = "500 22px Manrope Variable, sans-serif";
    g.fillText("Inbox  ›  Operations", 60, 80);
    g.fillStyle = "#fff";
    g.font = "700 46px Manrope Variable, sans-serif";
    g.fillText("Contract renewal — confirmation needed", 60, 148);
    g.fillStyle = "#2f5fe0";
    g.beginPath();
    g.arc(92, 228, 32, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "700 22px Manrope Variable, sans-serif";
    g.textAlign = "center";
    g.fillText("EB", 92, 236);
    g.textAlign = "left";
    g.font = "700 28px Manrope Variable, sans-serif";
    g.fillText("Eva Brunner", 142, 222);
    g.fillStyle = "rgba(170,190,230,0.6)";
    g.font = "500 20px Manrope Variable, sans-serif";
    g.fillText("eva.brunner@alpinesupplies.ch", 142, 254);
    g.fillText("Today 09:12", 920, 222);
    g.fillStyle = "rgba(220,230,250,0.9)";
    g.font = "500 30px Manrope Variable, sans-serif";
    const lines = ["Hi Ziyad,", "Following up: the current contract expires Friday.", "Please confirm renewal so we can lock Q4 allocation.", "Without confirmation we cannot hold the Geneva", "warehouse slot.", "", "Best regards, Eva"];
    lines.forEach((l, i) => g.fillText(l, 60, 340 + i * 50));
    g.fillStyle = "rgba(170,190,230,0.7)";
    g.font = "500 21px Manrope Variable, sans-serif";
    g.fillText("Supply agreement 2026–27.pdf", 96, 712);
  });
}
function galaxy(map: THREE.Texture) {
  const scene = new THREE.Scene();
  const R = rng(77);
  const N = 900;
  const geo = new THREE.PlaneGeometry(340, 100);
  const aUV = new Float32Array(N * 2);
  const aFl = new Float32Array(N);
  const aCat = new Float32Array(N);
  const aA = new Float32Array(N).fill(1);
  const HERO = new THREE.Vector3(0, 0, 5200);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const tile = Math.floor(R() * 52);
    aUV.set(tileUV(tile), i * 2);
    aCat[i] = MSGS[tile % MSGS.length].cat;
    let p: THREE.Vector3;
    let face: THREE.Quaternion;
    if (i < 48) {
      // the inbox around the hero email: a column of rows, a few columns
      const col = (i % 4) - 1.5;
      const row = Math.floor(i / 4) - 5.5;
      p = HERO.clone().add(new THREE.Vector3(col * 420 + (col > 0 ? 340 : col < 0 ? -340 : 0), row * 125, -60));
      if (Math.abs(col) < 1 && Math.abs(row) < 4) p.x += col > 0 ? 260 : -260;
      face = new THREE.Quaternion();
    } else {
      // a galaxy: spiral arms around the core
      const arm = i % 4;
      const d = 900 + Math.pow(R(), 0.6) * 7000;
      const th = arm * (Math.PI / 2) + d * 0.00042 + (R() - 0.5) * 0.7;
      p = new THREE.Vector3(Math.sin(th) * d, (R() - 0.5) * 500 * (1 - d / 9000) + (R() - 0.5) * 200, Math.cos(th) * d);
      const look = new THREE.Matrix4().lookAt(p, new THREE.Vector3(p.x * 0.4, 2000, p.z * 1.6 + 3000), new THREE.Vector3(0, 1, 0));
      face = new THREE.Quaternion().setFromRotationMatrix(look);
    }
    pos.push(p);
    m4.compose(p, face, new THREE.Vector3(1, 1, 1));
    void q;
  }
  geo.setAttribute("aUV", new THREE.InstancedBufferAttribute(aUV, 2));
  const flA = new THREE.InstancedBufferAttribute(aFl, 1);
  geo.setAttribute("aFl", flA);
  geo.setAttribute("aCat", new THREE.InstancedBufferAttribute(aCat, 1));
  geo.setAttribute("aA", new THREE.InstancedBufferAttribute(aA, 1));
  const mesh = new THREE.InstancedMesh(geo, cardMaterial(map), N);
  mesh.frustumCulled = false;
  pos.forEach((p, i) => {
    const face = i < 48 ? new THREE.Quaternion() : new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-p.x * 0.3, -1800, -p.z * 0.3 - 3000), new THREE.Vector3(0, 1, 0)));
    m4.compose(p, face, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m4);
  });
  scene.add(mesh);
  const hero = new THREE.Mesh(new THREE.PlaneGeometry(1100, 760), new THREE.MeshBasicMaterial({ map: emailTex(), transparent: true, depthWrite: false }));
  hero.position.copy(HERO);
  scene.add(hero);
  // thousands of lines: every message, and thousands of data nodes, to the core
  const NN = 2600;
  const nodes: THREE.Vector3[] = [...pos];
  for (let k = 0; k < NN; k++) {
    const d = 700 + Math.pow(R(), 0.5) * 8500;
    const th = R() * Math.PI * 2;
    nodes.push(new THREE.Vector3(Math.sin(th) * d, (R() - 0.5) * 1400 * (1 - d / 10000), Math.cos(th) * d));
  }
  const L = nodes.length;
  const SEG = 12;
  const lp = new Float32Array(L * SEG * 2 * 3);
  const la = new Float32Array(L * SEG * 2);
  const ls = new Float32Array(L * SEG * 2);
  let w = 0;
  nodes.forEach((n) => {
    // a gentle curve into the core
    const mid = n.clone().multiplyScalar(0.45).add(new THREE.Vector3(0, n.length() * 0.08, 0));
    const curve = new THREE.QuadraticBezierCurve3(n, mid, new THREE.Vector3(0, 0, 0));
    const s = R();
    for (let k = 0; k < SEG; k++) {
      const a = curve.getPoint(k / SEG);
      const b = curve.getPoint((k + 1) / SEG);
      lp.set([a.x, a.y, a.z, b.x, b.y, b.z], w * 6);
      la.set([k / SEG, (k + 1) / SEG], w * 2);
      ls.set([s, s], w * 2);
      w++;
    }
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
  lg.setAttribute("aT", new THREE.BufferAttribute(la, 1));
  lg.setAttribute("aS", new THREE.BufferAttribute(ls, 1));
  const lmat = new THREE.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uT: { value: 0 }, uP: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aT; attribute float aS; varying float vT; varying float vS; void main(){ vT = aT; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uA; uniform float uT; uniform float uP; varying float vT; varying float vS;
      void main(){ if (vT > uP) discard; float pulse = exp(-abs(fract(vT - uT * 0.6 - vS) - 0.5) * 22.0);
        gl_FragColor = vec4(vec3(0.3, 0.6, 1.0) * (0.05 + 0.16 * vT + pulse * 0.5) * uA, 1.0); }`,
  });
  const lines = new THREE.LineSegments(lg, lmat);
  lines.frustumCulled = false;
  scene.add(lines);
  // node points
  const ng = new THREE.BufferGeometry().setFromPoints(nodes.slice(N));
  const nmat = new THREE.PointsMaterial({ color: 0x9fd0ff, size: 6, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(ng, nmat));
  // the core
  const coreMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vNW; varying vec3 vPW; void main(){ vN = normal; vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vPW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${NOISE} uniform float uT; varying vec3 vN; varying vec3 vNW; varying vec3 vPW;
      void main(){ vec3 V = normalize(cameraPosition - vPW); float f = max(dot(normalize(vNW), V), 0.0);
        float n = fbm(normalize(vN) * 3.0 + vec3(uT * 0.2, uT * 0.13, 0.0));
        vec3 c = mix(vec3(0.15, 0.35, 1.0), vec3(0.85, 0.95, 1.0), pow(f, 2.5) * (0.6 + 0.6 * n));
        c += vec3(0.3, 0.55, 1.0) * pow(1.0 - f, 3.0) * 1.5;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const coreS = new THREE.Mesh(new THREE.SphereGeometry(360, 96, 64), coreMat);
  scene.add(coreS);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("90,150,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
  halo.scale.set(3400, 3400, 1);
  scene.add(halo);
  const rings = [ringMesh(), ringMesh(0x9fc4ff)];
  rings[0].scale.setScalar(5.2);
  rings[1].scale.setScalar(7.4);
  const rg = new THREE.Group();
  rings.forEach((r) => rg.add(r));
  rg.rotation.x = -1.1;
  scene.add(rg);
  const st = stars(6000, 20000, 21, 1.4);
  scene.add(st.pts);
  const cam = new THREE.PerspectiveCamera(40, W / H, 1, 60000);
  return { scene, cam, mesh, lmat, nmat, coreMat, rg, st, HERO, hero };
}

/** Screen anchors the DOM layer follows (the GL frame runs first). */
export const hud = { rings: [] as Array<{ x: number; y: number; z: number }>, cards: [] as Array<{ x: number; y: number; z: number; on: number }> };
export const HERO_CARDS = [0, 1, 5, 3]; // Eva · Marc · Q4 allocation · Sofia
export const COUNTS = { total: 0, reply: 0, wait: 0, noise: 0 };
const toScreen = (v: THREE.Vector3, c: THREE.Camera) => {
  const p = v.clone().project(c);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z };
};

export function initGL() {
  const canvas = $<HTMLCanvasElement>("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x010208, 1);
  const map = atlas();
  const ch = chaos(map);
  const gx = galaxy(map);
  // calm: deep blue space with a few particles
  const calm = new THREE.Scene();
  const cst = stars(4000, 3000, 31, 1.3);
  calm.add(cst.pts);
  const cdu = dust(900, 3000, 17);
  calm.add(cdu.pts);
  const cglows = (
    [
      [-500, 200, -1400, 2600, "30,80,255", 0.4],
      [600, -300, -1600, 2800, "20,55,190", 0.4],
      [0, 0, -1200, 1500, "80,150,255", 0.18],
    ] as Array<[number, number, number, number, string, number]>
  ).map(([x, y, z, s, c, o]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o }));
    sp.position.set(x, y, z);
    sp.scale.set(s, s * 0.7, 1);
    calm.add(sp);
    return sp;
  });
  const ccam = new THREE.PerspectiveCamera(50, W / H, 1, 8000);
  const fog = $("#fog");
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e3 = new THREE.Euler();
  const sc = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);
  const ID = new THREE.Quaternion();

  const chaosCam = (t: number) => {
    const tc = t < T.stop ? t : T.stop + (t - T.stop) * 0.015;
    const chaosK = smooth(P(tc, T.flood, T.stop));
      const cp = new THREE.Vector3();
      const look = new THREE.Vector3();
      let fov = 40;
      let roll = 0;
      if (t < T.stop) {
        // calm drift, then flight through the storm, faster and faster
        const k0 = smooth(P(t, 0, T.ten));
        const ang = Math.pow(Math.max(0, t - T.ten), 1.9) * 0.05;
        const r = lerp(lerp(1500, 760, k0), 620, chaosK);
        cp.set(Math.sin(ang) * r, lerp(140, 40, k0) + Math.sin(t * 1.7) * 90 * chaosK, Math.cos(ang) * r);
        look.set(Math.sin(ang + 0.6 * chaosK) * 300 * chaosK, 30, Math.cos(ang + 0.6 * chaosK) * 300 * chaosK - 0);
        fov = lerp(36, 58, chaosK);
        roll = Math.sin(t * 2.1) * 0.25 * chaosK + Math.sin(t * 9) * 0.03 * chaosK;
        // whip pans
        const whip = [7.0, 8.6, 9.6, 10.6, 11.3].reduce((acc, w) => acc + Math.exp(-Math.pow((t - w) / 0.12, 2)) * 0.5, 0);
        look.x += whip * 600;
      } else if (t < T.wave + 0.8) {
        // bullet time: the camera keeps gliding through the frozen storm
        const angS = Math.pow(T.stop - T.ten, 1.9) * 0.05;
        const k = ease.io3(P(t, T.stop, T.logo + 0.6));
        const ang = angS + (t - T.stop) * 0.07;
        const r = lerp(620, 1350, k);
        cp.set(Math.sin(ang) * r, lerp(60, 140, k), Math.cos(ang) * r);
        look.set(0, lerp(60, 0, k), 0);
        fov = lerp(58, 42, k);
        const punch = t > T.wave ? Math.exp(-(t - T.wave) * 5) : 0;
        cp.x += Math.sin(t * 50) * punch * 25;
        cp.y += Math.sin(t * 43) * punch * 25;
      } else {
        // the transformation: a slow, rising orbit; then the inbox, face on
        const angS = Math.pow(T.stop - T.ten, 1.9) * 0.05 + (T.wave + 0.8 - T.stop) * 0.07;
        const k = P(t, T.wave + 0.8, T.act + 1.0);
        const ang = angS + ease.io3(k) * 1.6;
        const r = lerp(1350, 2500, ease.io3(k));
        const y = lerp(140, 900, ease.io3(k));
        const orbit = new THREE.Vector3(Math.sin(ang) * r, y, Math.cos(ang) * r);
        const kf = ease.io3(P(t, T.act + 0.6, T.inbox));
        cp.copy(orbit).lerp(new THREE.Vector3(0, 0, 1400), kf);
        look.set(0, lerp(0, 0, kf), 0);
        fov = 40;
      }

    return { cp, look, fov, roll };
  };
  const qcam = new THREE.PerspectiveCamera();
  onFrame((t) => {
    fog.style.opacity = "0";
    // ── chaos → order ─────────────────────────────────────────────────────
    if (t < T.inbox + 0.5) {
      const s = ch;
      s.du.mat.uniforms.uT.value = t;
      s.st.mat.uniforms.uT.value = t;
      (s.floor.material as THREE.ShaderMaterial).uniforms.uT.value = t;
      // time for the chaos itself: it freezes at the stop (bullet time)
      const tc = t < T.stop ? t : T.stop + (t - T.stop) * 0.015;
      const chaosK = smooth(P(tc, T.flood, T.stop));
      const dark = smooth(P(t, T.stop, T.stop + 0.35)) * (1 - smooth(P(t, T.wave, T.wave + 0.5)));
      // camera
      const { cp, look, fov, roll } = chaosCam(t);
      s.cam.position.copy(cp);
      s.cam.fov = fov;
      s.cam.updateProjectionMatrix();
      s.cam.lookAt(look);
      s.cam.rotateZ(roll);
      s.cam.updateMatrixWorld();
      // void → dim at the stop
      (s.floor.material as THREE.ShaderMaterial).uniforms.uA.value = (0.3 + 0.7 * smooth(P(t, 0, 2))) * (1 - dark * 0.9) * (1 - smooth(P(t, T.understand, T.organize)));
      s.du.mat.uniforms.uA.value = 1 - dark * 0.8;
      s.mat.uniforms.uDim.value = dark;
      // the core
      const lit = smooth(P(t, T.light, T.light + 0.4));
      const ringOn = ease.out3(P(t, T.logo, T.logo + 0.8));
      s.point.material.opacity = lit * (1 - 0.6 * ringOn);
      s.point.scale.setScalar(lerp(10, 120, lit) * (1 + 0.15 * Math.sin(t * 6)));
      s.glow.material.opacity = lit * 0.8 + (t > T.wave ? 0.6 * Math.exp(-(t - T.wave) * 2) : 0);
      s.glow.scale.setScalar(lerp(200, 900, ringOn) + (t > T.wave ? 3000 * Math.exp(-(t - T.wave) * 2.5) : 0));
      (s.ring.material as THREE.MeshBasicMaterial).opacity = ringOn * (0.9 + 0.1 * Math.sin(t * 5));
      s.ring.scale.setScalar(lerp(0.4, 1.3, ringOn) * (t < T.inbox - 0.6 ? 1 : 1 - ease.in3(P(t, T.inbox - 0.6, T.inbox))));
      s.core.quaternion.copy(s.cam.quaternion);
      s.core.visible = t > T.light - 0.1;
      // the wave
      const wr = ease.out3(P(t, T.wave, T.wave + 1.3)) * 5200;
      s.wave.scale.setScalar(Math.max(1, wr));
      (s.wave.material as THREE.ShaderMaterial).uniforms.uA.value = t >= T.wave ? 1 - P(t, T.wave, T.wave + 1.3) : 0;
      s.waveRing.scale.setScalar(Math.max(1, wr * 0.9));
      (s.waveRing.material as THREE.MeshBasicMaterial).opacity = t >= T.wave ? 1 - P(t, T.wave, T.wave + 1.1) : 0;
      s.guides.forEach((g, k) => ((g.material as THREE.MeshBasicMaterial).opacity = smooth(P(t, T.organize + 0.3 + k * 0.15, T.organize + 0.9 + k * 0.15)) * 0.45 * (1 - smooth(P(t, T.act + 0.8, T.inbox - 0.2)))));
      // cards
      const lineOn = smooth(P(t, T.understand, T.understand + 0.6)) * (1 - smooth(P(t, T.organize + 0.6, T.act)));
      s.lmat.uniforms.uA.value = lineOn * 1.6;
      s.lmat.uniforms.uT.value = t;
      const cards: Array<{ x: number; y: number; z: number; on: number }> = [];
      const cq = chaosCam(Math.min(t, T.stop));
      qcam.position.copy(cq.cp);
      qcam.lookAt(cq.look);
      qcam.rotateZ(cq.roll);
      const qFace = qcam.quaternion.clone();
      for (let i = 0; i < s.N; i++) {
        const c = s.card[i];
        const born = tc >= c.birth;
        const ka = ease.out5(P(tc, c.birth, c.birth + (i < 2 ? 1.2 : 0.55)));
        const pos = c.from.clone().lerp(c.home, ka);
        const age = Math.max(0, tc - c.birth);
        pos.addScaledVector(c.vel, age * (0.3 + chaosK * 1.4));
        pos.y += Math.sin(tc * 1.3 + c.ph) * 25;
        const sp = 0.25 + chaosK * 1.6;
        e3.set(Math.sin(age * c.spin.x * 0.5 + c.ph) * 0.45 * sp, Math.sin(age * c.spin.y * 0.4 + c.ph) * 0.55 * sp, Math.sin(age * c.spin.z * 0.4) * 0.3 * sp);
        q.copy(qFace).multiply(new THREE.Quaternion().setFromEuler(e3));
        let scale = born ? (i < 2 ? lerp(0.6, 1.25, ka) : 1) : 0;
        let alpha = born ? Math.min(1, ka * 2) : 0;
        let fl = 0;
        // the wave touches every card: it is understood
        const hitT = T.wave + (pos.length() / 5200) * 1.3;
        if (t >= hitT) fl = 0.35 + 0.65 * Math.exp(-(t - hitT) * 3);
        if (t >= T.understand) {
          // drawn toward the core, along a spiral, facing the camera
          const k = ease.io3(P(t, T.understand + c.lane * 0.6, T.organize + c.lane * 0.4));
          const dirv = pos.clone().setY(0).normalize();
          const r0 = 520 + c.lane * 900;
          const ang0 = Math.atan2(dirv.x, dirv.z) + (t - T.understand) * 0.25 * (1 - c.lane * 0.5);
          const spiral = new THREE.Vector3(Math.sin(ang0) * r0, (c.lane - 0.5) * 500, Math.cos(ang0) * r0);
          pos.lerp(spiral, k);
          q.slerp(new THREE.Quaternion().setFromAxisAngle(Y, ang0), k);
        }
        if (t >= T.organize) {
          if (c.cat === 3) {
            // noise disintegrates
            const kd = P(t, T.organize + c.lane * 0.8, T.organize + 0.35 + c.lane * 0.8);
            scale *= 1 - kd;
            alpha *= 1 - kd;
          } else {
            const rg = RINGS[c.ring];
            const per = [3, 40, 160][c.ring];
            const ko = ease.io3(P(t, T.organize + 0.2 + (c.slot % 9) * 0.04, T.organize + 1.4 + (c.slot % 9) * 0.04));
            const angR = (c.slot / Math.max(1, Math.min(per, 60))) * Math.PI * 2 + (t - T.organize) * (0.25 - c.ring * 0.06);
            const lift = c.ring === 0 ? smooth(P(t, T.act, T.act + 0.6)) * 120 : 0;
            const target = new THREE.Vector3(Math.sin(angR) * rg.r, rg.y + lift + Math.floor(c.slot / 60) * 34, Math.cos(angR) * rg.r);
            pos.lerp(target, ko);
            q.slerp(new THREE.Quaternion().setFromAxisAngle(Y, angR), ko);
            if (c.ring === 2) {
              // can wait: quietly stacks up, dims
              alpha *= 1 - 0.45 * ko;
            }
          }
        }
        if (t >= T.act + 0.7 && c.cat < 3) {
          // everything lands in the organized inbox
          const row = c.ring === 0 ? Math.min(2, c.slot) : c.ring === 1 ? 3 : 4;
          const lt = T.act + 0.7 + (c.ring === 0 ? 0 : 0.15 + (c.slot % 30) * 0.01);
          const kl = ease.io3(P(t, lt, T.inbox - 0.05));
          const target = toWorld(W / 2, ROWS_Y[row]);
          target.z = -2 * (c.slot % 10);
          pos.lerp(target, kl);
          q.slerp(ID, kl);
          scale = lerp(scale, row < 3 ? 2.05 : 2.05 * (1 - 0.02 * (c.slot % 10)), kl);
          if (row >= 3) alpha *= 1 - 0.85 * kl * (c.slot > 0 ? 1 : 0);
          alpha *= 1 - smooth(P(t, T.inbox - 0.02, T.inbox + 0.3));
        }
        m4.compose(pos, q, sc.set(scale, scale, scale));
        s.mesh.setMatrixAt(i, m4);
        s.aFl[i] = fl * (t >= T.inbox ? 0 : 1);
        s.aA[i] = alpha;
        // data line, card → core
        s.lpos.set([pos.x, pos.y, pos.z, 0, 0, 0], i * 6);
        if (HERO_CARDS.includes(i)) {
          const sp2 = toScreen(pos, s.cam);
          cards[HERO_CARDS.indexOf(i)] = { ...sp2, on: alpha };
        }
      }
      s.mesh.instanceMatrix.needsUpdate = true;
      s.flA.needsUpdate = true;
      s.aAA.needsUpdate = true;
      s.lposA.needsUpdate = true;
      hud.cards = cards;
      // disintegration particles
      const kp = P(t, T.organize, T.organize + 2.0);
      s.pmat.uniforms.uA.value = t >= T.organize ? Math.sin(Math.PI * Math.min(1, kp * 1.1)) : 0;
      if (t >= T.organize && t < T.organize + 2.2) {
        const arr = s.pposA.array as Float32Array;
        const mm = new THREE.Matrix4();
        const v = new THREE.Vector3();
        for (let k = 0; k < s.PN; k++) {
          const owner = s.pown[k];
          const c = s.card[owner];
          const start = T.organize + c.lane * 0.8;
          const kk = clamp((t - start) / 1.2);
          s.mesh.getMatrixAt(owner, mm);
          v.set(s.ppos[k * 3], s.ppos[k * 3 + 1], 0);
          if (kk <= 0) {
            arr.set([0, -99999, 0], k * 3);
            continue;
          }
          // take the card's place at the moment it breaks, then scatter upward
          v.add(new THREE.Vector3().setFromMatrixPosition(mm));
          v.x += s.pdir[k * 3] * kk * 500;
          v.y += s.pdir[k * 3 + 1] * kk * 500 + kk * kk * 300;
          v.z += s.pdir[k * 3 + 2] * kk * 500;
          arr.set([v.x, v.y, v.z], k * 3);
        }
        s.pposA.needsUpdate = true;
      }
      hud.rings = RINGS.map((rg) => toScreen(new THREE.Vector3(new THREE.Vector3(1, 0, 0).applyQuaternion(s.cam.quaternion).x * (rg.r + 140), rg.y, new THREE.Vector3(1, 0, 0).applyQuaternion(s.cam.quaternion).z * (rg.r + 140)), s.cam));
      renderer.render(s.scene, s.cam);
      return;
    }
    hud.cards = [];
    // ── the galaxy: pull back, wire, orbit, dive ──────────────────────────
    if (t >= T.galaxy - 0.1 && t < T.app) {
      const g = gx;
      g.st.mat.uniforms.uT.value = t;
      g.coreMat.uniforms.uT.value = t;
      g.lmat.uniforms.uT.value = t;
      g.rg.rotation.y = t * 0.15;
      const start = g.HERO.clone().add(new THREE.Vector3(0, 0, 1483));
      const k1 = ease.io5(P(t, T.galaxy, T.orbit + 0.2));
      // the pull-back: straight back from the email, rising
      const back = new THREE.Vector3(0, 4200, 16500);
      let cp = start.clone().lerp(back, k1);
      let look = g.HERO.clone().lerp(new THREE.Vector3(0, 0, 0), smooth(P(t, T.galaxy + 0.8, T.orbit)));
      let fov = lerp(40, 48, k1);
      if (t >= T.orbit) {
        // circle the core
        const k = ease.io3(P(t, T.orbit, T.dive + 0.2));
        const a = lerp(0, 1.5, k);
        const r = lerp(Math.hypot(back.x, back.z), 5200, k);
        const y = lerp(back.y, 900, k);
        cp = new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r).lerp(cp, 1 - smooth(P(t, T.orbit, T.orbit + 0.4)));
        look = new THREE.Vector3(0, 0, 0);
      }
      if (t >= T.dive) {
        // dive straight into it
        const k = ease.in3(P(t, T.dive, T.app));
        cp = cp.clone().lerp(new THREE.Vector3(0, 0, 0), k * 0.97);
        fov = lerp(48, 95, k);
      }
      g.cam.position.copy(cp);
      g.cam.fov = fov;
      g.cam.updateProjectionMatrix();
      g.cam.lookAt(look);
      g.cam.rotateZ(t >= T.orbit ? Math.sin(P(t, T.orbit, T.app) * Math.PI) * -0.12 : 0);
      const lp = ease.out3(P(t, T.lines, T.orbit + 0.4));
      g.lmat.uniforms.uP.value = lp;
      g.lmat.uniforms.uA.value = smooth(P(t, T.lines, T.lines + 0.3));
      g.nmat.opacity = smooth(P(t, T.lines + 0.2, T.lines + 1.0)) * 0.8;
      (g.hero.material as THREE.MeshBasicMaterial).opacity = 1;
      fog.style.opacity = (smooth(P(t, T.app - 0.3, T.app)) * 1).toFixed(3);
      renderer.render(g.scene, g.cam);
      return;
    }
    // ── calm: the app, then the end ───────────────────────────────────────
    cst.mat.uniforms.uT.value = t;
    cdu.mat.uniforms.uT.value = t;
    const kr = smooth(P(t, T.recede, T.end));
    ccam.position.set(Math.sin(t * 0.12) * 50, Math.cos(t * 0.1) * 30, lerp(600, 1100, kr));
    ccam.lookAt(0, 0, -800);
    cglows.forEach((s, i) => (s.material.rotation = t * 0.04 * (i % 2 ? 1 : -1)));
    fog.style.opacity = t >= T.app && t < T.app + 0.6 ? (1 - smooth(P(t, T.app, T.app + 0.6))).toFixed(3) : "0";
    renderer.render(calm, ccam);
  });
}
