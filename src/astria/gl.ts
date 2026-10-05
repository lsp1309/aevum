import * as THREE from "three";
import { onFrame, clamp, smooth, lerp, rng } from "../core/clock";
import { T } from "./timing";
import { W, H, $ } from "../remix/stage";
import { RING_A, RING_B, RING_W, RING_TILT } from "../core/icons";

/**
 * The 3D world of the film (Three.js), a pure function of time:
 *   space   — stars, the planet (continents, clouds, night cities, atmosphere),
 *             the mail signal, later the network of light around it
 *   city    — the night city the camera skims before reaching the beacon
 *   fx      — the icon that bursts into particles and rebuilds the interface
 *   back    — a quiet backdrop of stars and light for the interface scenes
 *   swarm   — hundreds of emails in space, the core, the shockwave, the lanes
 */
const ease = {
  in3: (x: number) => x * x * x,
  out3: (x: number) => 1 - Math.pow(1 - x, 3),
  io3: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out5: (x: number) => 1 - Math.pow(1 - x, 5),
  in5: (x: number) => x * x * x * x * x,
};
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));

export const NOISE = `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; } return v; }
`;

// ── textures drawn on canvases ────────────────────────────────────────────
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function mailGlyph(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, lw: number) {
  g.lineJoin = "round";
  g.lineCap = "round";
  g.lineWidth = lw;
  g.beginPath();
  g.roundRect(cx - s, cy - s * 0.7, 2 * s, 1.4 * s, s * 0.18);
  g.stroke();
  g.beginPath();
  g.moveTo(cx - s * 0.86, cy - s * 0.52);
  g.lineTo(cx, cy + s * 0.12);
  g.lineTo(cx + s * 0.86, cy - s * 0.52);
  g.stroke();
}
const signalTex = () =>
  canvasTex(512, 512, (g) => {
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, "rgba(140,200,255,0.9)");
    gr.addColorStop(0.25, "rgba(60,130,255,0.55)");
    gr.addColorStop(1, "rgba(20,60,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "rgba(10,30,110,0.85)";
    g.beginPath();
    g.roundRect(146, 146, 220, 220, 56);
    g.fill();
    g.strokeStyle = "#e9f4ff";
    g.shadowColor = "#7fc4ff";
    g.shadowBlur = 24;
    g.lineWidth = 10;
    g.beginPath();
    g.roundRect(146, 146, 220, 220, 56);
    g.stroke();
    mailGlyph(g, 256, 260, 62, 12);
  });
const glowTex = (rgb = "120,180,255") =>
  canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.2, `rgba(${rgb},0.45)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });

// ── stars ─────────────────────────────────────────────────────────────────
function stars(n: number, r: number, seed: number) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const tw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    // a faint galactic band: more stars near one great circle
    const band = R() < 0.45 ? 0.18 : 1;
    pos.set([r * s * Math.cos(a), r * u * band, r * s * Math.sin(a)], i * 3);
    size[i] = 0.6 + Math.pow(R(), 6) * 4.5;
    tw[i] = R() * 6.28;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aTw", new THREE.BufferAttribute(tw, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: `attribute float aSize; attribute float aTw; uniform float uT; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        vA = 0.65 + 0.35 * sin(uT * 2.0 + aTw); gl_PointSize = aSize * 1.6; }`,
    fragmentShader: `uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(0.78, 0.86, 1.0) * a * vA * uA, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return { pts: new THREE.Points(g, m), mat: m };
}

// ── the planet ────────────────────────────────────────────────────────────
function planet() {
  const grp = new THREE.Group();
  const sun = new THREE.Vector3(-0.85, 0.3, 0.42).normalize();
  const surf = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uCity: { value: 1 }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vNW; varying vec3 vPW;
      void main(){ vN = normal; vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vPW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${NOISE}
      uniform vec3 uSun; uniform float uCity; uniform float uT; varying vec3 vN; varying vec3 vNW; varying vec3 vPW;
      void main(){
        vec3 n = normalize(vN);
        float land = fbm(n * 2.1 + vec3(3.1, 1.2, 7.7));
        float coast = smoothstep(0.47, 0.53, land);
        float det = fbm(n * 11.0);
        vec3 ocean = mix(vec3(0.006, 0.03, 0.12), vec3(0.03, 0.14, 0.38), smoothstep(0.3, 0.5, land));
        vec3 ground = mix(vec3(0.08, 0.13, 0.27), vec3(0.2, 0.28, 0.48), det);
        float ice = smoothstep(0.82, 0.92, abs(n.y) + det * 0.1);
        vec3 col = mix(ocean, ground, coast);
        col = mix(col, vec3(0.55, 0.65, 0.85), ice * 0.7);
        vec3 N = normalize(vNW);
        vec3 V = normalize(cameraPosition - vPW);
        float dl = dot(N, uSun);
        float day = smoothstep(-0.18, 0.4, dl);
        vec3 lit = col * (0.15 + 1.2 * max(dl, 0.0));
        vec3 c = mix(col * 0.06 + vec3(0.003, 0.007, 0.02), lit, day);
        // ocean glint
        vec3 Rf = reflect(-uSun, N);
        c += vec3(0.6, 0.8, 1.0) * pow(max(dot(Rf, V), 0.0), 90.0) * day * (1.0 - coast) * 0.45;
        // night cities: clusters on land, sparkling points
        float cl = smoothstep(0.55, 0.75, fbm(n * 7.0 + 11.0)) * coast;
        float pts = pow(vnoise(n * 140.0), 6.0) * 6.0 + pow(vnoise(n * 60.0), 4.0) * 1.5;
        c += vec3(0.42, 0.72, 1.0) * cl * pts * (1.0 - day) * uCity;
        // rim
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        c += vec3(0.15, 0.4, 1.0) * fr * (0.25 + 0.9 * smoothstep(-0.3, 0.5, dl));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), surf);
  const clouds = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uT: { value: 0 }, uA: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vNW; void main(){ vN = normal; vNW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `${NOISE} uniform vec3 uSun; uniform float uT; uniform float uA; varying vec3 vN; varying vec3 vNW;
      void main(){ vec3 n = normalize(vN); float d = fbm(n * 3.2 + vec3(uT * 0.01, 0.0, 0.0) + fbm(n * 6.0) * 0.8);
        float a = smoothstep(0.52, 0.78, d) * 0.75;
        float dl = dot(normalize(vNW), uSun); float day = smoothstep(-0.2, 0.5, dl);
        vec3 c = mix(vec3(0.03, 0.07, 0.18), vec3(0.8, 0.9, 1.0) * (0.35 + 0.8 * max(dl, 0.0)), day);
        gl_FragColor = vec4(c, a * uA); }`,
    transparent: true,
    depthWrite: false,
  });
  const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.014, 128, 96), clouds);
  const atm = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uA: { value: 1 } },
    vertexShader: `varying vec3 vNW; varying vec3 vPW; void main(){ vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vPW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uSun; uniform float uA; varying vec3 vNW; varying vec3 vPW;
      void main(){ vec3 N = normalize(vNW); vec3 V = normalize(cameraPosition - vPW);
        float d = -dot(N, V);
        float a = pow(smoothstep(0.0, 0.36, d), 2.6);
        float lit = 0.4 + 0.9 * smoothstep(-0.4, 0.6, dot(N, uSun));
        vec3 c = mix(vec3(0.08, 0.3, 1.0), vec3(0.6, 0.88, 1.0), a) * a * 1.6 * lit;
        gl_FragColor = vec4(c * uA, 1.0); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.06, 96, 72), atm);
  grp.add(sphere, cloudMesh, atmo);
  return { grp, surf, clouds, atm, sun };
}

// ── the night city and its beacon ─────────────────────────────────────────
function city(sigTex: THREE.Texture) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020510, 0.0011);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 9000),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `${NOISE} varying vec3 vP;
        void main(){ vec2 p = vP.xz;
          vec2 g = abs(fract(p / 70.0) - 0.5);
          float street = smoothstep(0.035, 0.0, min(g.x, g.y) - 0.0);
          vec2 g2 = abs(fract(p / 350.0) - 0.5);
          float avenue = smoothstep(0.012, 0.0, min(g2.x, g2.y));
          float lights = pow(vnoise(vec3(p * 0.25, 1.0)), 10.0) * 4.0;
          float d = length(p - vec2(0.0, -900.0));
          vec3 c = vec3(0.004, 0.008, 0.02) + vec3(0.2, 0.45, 1.0) * street * 0.55 + vec3(0.6, 0.85, 1.0) * avenue * 1.4 + vec3(0.5, 0.75, 1.0) * lights;
          c += vec3(0.1, 0.3, 1.0) * exp(-d / 380.0) * 0.8;
          float fog = exp(-length(cameraPosition.xz - p) / 2600.0);
          gl_FragColor = vec4(c * fog + vec3(0.01, 0.025, 0.08) * (1.0 - fog), 1.0); }`,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  // buildings with lit windows
  const R = rng(91);
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.ShaderMaterial({
    vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position,1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${NOISE} varying vec3 vP; varying vec3 vN;
      void main(){ vec2 q = abs(vN.x) > 0.5 ? vP.zy : vP.xy;
        vec2 cell = floor(q / vec2(9.0, 7.0));
        vec2 f = fract(q / vec2(9.0, 7.0));
        float win = step(0.25, f.x) * step(f.x, 0.75) * step(0.3, f.y) * step(f.y, 0.7);
        float on = step(0.62, h31(vec3(cell, floor(vP.z * 0.01))));
        vec3 c = vec3(0.012, 0.02, 0.05) + vec3(0.45, 0.72, 1.0) * win * on * 0.9;
        c += vec3(0.1, 0.25, 0.8) * smoothstep(0.9, 1.0, vN.y) * 0.15;
        float fog = exp(-length(cameraPosition - vP) / 2400.0);
        gl_FragColor = vec4(c * fog + vec3(0.01, 0.025, 0.08) * (1.0 - fog), 1.0); }`,
  });
  const N = 520;
  const bld = new THREE.InstancedMesh(bGeo, bMat, N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    let x = (R() * 2 - 1) * 2200;
    if (Math.abs(x) < 120) x += Math.sign(x || 1) * 160;
    const z = 600 - R() * 3400;
    const w = 40 + R() * 70;
    const h = 30 + Math.pow(R(), 2) * 320 + (Math.abs(x) < 400 ? 60 : 0);
    m4.makeScale(w, h, w);
    m4.setPosition(Math.round(x / 70) * 70 + 35, 0, Math.round(z / 70) * 70 + 35);
    bld.setMatrixAt(i, m4);
  }
  scene.add(bld);
  // sky haze
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(5000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vD; void main(){ float h = vD.y; vec3 c = mix(vec3(0.05, 0.14, 0.45), vec3(0.003, 0.006, 0.02), smoothstep(0.0, 0.35, h)); gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(sky);
  // the beacon: a column of light, the mail icon at its head
  const BZ = -900;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 9, 1800, 24, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vU; void main(){ float a = (1.0 - vU.y) * 0.9 + 0.1; gl_FragColor = vec4(vec3(0.5, 0.78, 1.0) * a, 1.0); }`,
    }),
  );
  beam.position.set(0, 900, BZ);
  scene.add(beam);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(900, 900, 1);
  halo.position.set(0, 140, BZ);
  scene.add(halo);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: sigTex, transparent: true, depthWrite: false }));
  icon.scale.set(130, 130, 1);
  icon.position.set(0, 140, BZ);
  scene.add(icon);
  const cam = new THREE.PerspectiveCamera(60, W / H, 1, 12000);
  return { scene, cam, BZ };
}

// ── the email swarm (wow scene) ───────────────────────────────────────────
const CAT = [
  { name: "PRIORITY", c: [1.0, 1.0, 1.0] },
  { name: "REPLIES", c: [0.35, 0.9, 1.0] },
  { name: "CALENDAR", c: [0.3, 0.55, 1.0] },
  { name: "FINANCE", c: [0.55, 0.6, 1.0] },
  { name: "NEWSLETTERS", c: [0.45, 0.62, 0.85] },
];
export const LANES = CAT;
function mailAtlas() {
  const people = [
    ["L", "Luka · Alpine Supplies", "Contract renewal — confirm Friday"],
    ["Z", "Ziyad · Ops", "Shipment AT-8891 delayed"],
    ["HL", "Helios Legal", "September legal brief"],
    ["SP", "Silo Pay", "Payment received — INV-4820"],
    ["NR", "Northline", "Product newsletter — October"],
    ["AF", "Atlas Freight", "Tracking update"],
    ["#", "#launch-q4", "Who owns the Milan rollout?"],
    ["L", "Luka · Alpine Supplies", "Invoice 4821 — payment status"],
    ["D", "Drive", "Q4 allocation.xlsx shared"],
    ["C", "Calendar", "Kickoff conflicts with 2 events"],
    ["M", "Mara · Design", "Deck review before Thursday?"],
    ["B", "Bank Alpine", "Statement available"],
  ];
  return canvasTex(1024, 1024, (g) => {
    for (let i = 0; i < 30; i++) {
      const cx = (i % 3) * 341;
      const cy = Math.floor(i / 3) * 102;
      const p = people[i % people.length];
      const gr = g.createLinearGradient(0, cy, 0, cy + 96);
      gr.addColorStop(0, "#152246");
      gr.addColorStop(1, "#0a1129");
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(cx + 3, cy + 3, 334, 94, 16);
      g.fill();
      g.strokeStyle = "rgba(150,190,255,0.35)";
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = i % 4 === 0 ? "#3b7bff" : "#2a3a66";
      g.beginPath();
      g.arc(cx + 38, cy + 50, 20, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#eaf2ff";
      g.font = "700 15px Manrope Variable, sans-serif";
      g.textAlign = "center";
      g.fillText(p[0], cx + 38, cy + 55);
      g.textAlign = "left";
      g.font = "700 18px Manrope Variable, sans-serif";
      g.fillText(p[1], cx + 70, cy + 42);
      g.fillStyle = "rgba(200,216,245,0.7)";
      g.font = "500 15px Manrope Variable, sans-serif";
      g.fillText(p[2], cx + 70, cy + 68);
      g.fillStyle = "#4d8dff";
      g.beginPath();
      g.arc(cx + 316, cy + 26, 6, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function swarm() {
  const scene = new THREE.Scene();
  const N = 420;
  const R = rng(2184);
  const geo = new THREE.PlaneGeometry(340, 96);
  const aUV = new Float32Array(N * 2);
  const aFl = new Float32Array(N);
  const aCat = new Float32Array(N * 3);
  const lane = new Int32Array(N);
  const slot = new Int32Array(N);
  const counts = [0, 0, 0, 0, 0];
  const quota = [10, 70, 50, 60, 230];
  for (let i = 0; i < N; i++) {
    const v = i % 30;
    aUV.set([(v % 3) * (341 / 1024), 1 - (Math.floor(v / 3) + 1) * (102 / 1024)], i * 2);
    let k = Math.floor(R() * 5);
    while (counts[k] >= quota[k]) k = (k + 1) % 5;
    lane[i] = k;
    slot[i] = counts[k]++;
    aCat.set(CAT[k].c, i * 3);
  }
  geo.setAttribute("aUV", new THREE.InstancedBufferAttribute(aUV, 2));
  const flAttr = new THREE.InstancedBufferAttribute(aFl, 1);
  geo.setAttribute("aFl", flAttr);
  geo.setAttribute("aCat", new THREE.InstancedBufferAttribute(aCat, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: mailAtlas() }, uSort: { value: 0 } },
    vertexShader: `attribute vec2 aUV; attribute float aFl; attribute vec3 aCat; varying vec2 vUv; varying float vFl; varying vec3 vCat;
      void main(){ vUv = aUV + uv * vec2(341.0 / 1024.0, 102.0 / 1024.0); vFl = aFl; vCat = aCat;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uSort; varying vec2 vUv; varying float vFl; varying vec3 vCat;
      void main(){ vec4 c = texture2D(uMap, vUv); if (c.a < 0.05) discard;
        vec3 col = c.rgb + vec3(0.5, 0.8, 1.0) * vFl * 0.9;
        col = mix(col, col * 0.75 + vCat * 0.35, uSort);
        gl_FragColor = vec4(col, c.a); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  scene.add(mesh);
  // chaos parameters: each mail arrives from far away on a spiral
  const ch = Array.from({ length: N }, () => {
    const u = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return { d: new THREE.Vector3(s * Math.cos(a), u * 0.7, s * Math.sin(a)), r0: 1800 + R() * 2600, r1: 260 + R() * 900, sp: (R() * 2 - 1) * 1.2, ph: R() * 6.28, tilt: (R() - 0.5) * 1.4 };
  });
  // the core: the Astria ring, glowing
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, RING_A, RING_B, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, RING_A - RING_W, ((RING_A - RING_W) * RING_B) / RING_A, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const ring = new THREE.Mesh(new THREE.ShapeGeometry(shape, 96), new THREE.MeshBasicMaterial({ color: 0xdff0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.z = (RING_TILT * Math.PI) / 180;
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("90,150,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const core = new THREE.Group();
  core.add(coreGlow, ring);
  scene.add(core);
  // shockwave: a shell of light
  const wave = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vNW; varying vec3 vPW; void main(){ vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vPW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uA; varying vec3 vNW; varying vec3 vPW; void main(){ vec3 V = normalize(cameraPosition - vPW); float r = 1.0 - abs(dot(normalize(vNW), V)); gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * pow(r, 3.0) * uA * 2.0, 1.0); }`,
    }),
  );
  scene.add(wave);
  const waveRing = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 128), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  waveRing.rotation.x = Math.PI / 2.4;
  scene.add(waveRing);
  // lanes: five rivers of light running into the depth
  const RAD = 470;
  const laneLines: THREE.Line[] = [];
  CAT.forEach((c, k) => {
    const th = Math.PI / 2 + (k * Math.PI * 2) / 5;
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(th) * (RAD - 70), Math.sin(th) * (RAD - 70), 600), new THREE.Vector3(Math.cos(th) * (RAD - 70), Math.sin(th) * (RAD - 70), -7000)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: new THREE.Color(...c.c), transparent: true, blending: THREE.AdditiveBlending, opacity: 0 }));
    scene.add(l);
    laneLines.push(l);
  });
  const st = stars(5000, 6000, 17);
  scene.add(st.pts);
  const cam = new THREE.PerspectiveCamera(50, W / H, 1, 20000);
  const target = (i: number) => {
    const k = lane[i];
    const th = Math.PI / 2 + (k * Math.PI * 2) / 5;
    const j = slot[i];
    const across = (j % 2) * 2 - 1;
    const z = 300 - Math.floor(j / 2) * 150;
    const tang = new THREE.Vector3(-Math.sin(th), Math.cos(th), 0).multiplyScalar(across * 190);
    return new THREE.Vector3(Math.cos(th) * RAD, Math.sin(th) * RAD, z).add(tang);
  };
  const targets = Array.from({ length: N }, (_, i) => target(i));
  return { scene, cam, mesh, ch, targets, flAttr, aFl, mat, core, ring, coreGlow, wave, waveRing, laneLines, N, lane, RAD, st };
}

// ── the particles: icon → explosion → interface ───────────────────────────
function particles(uiRects: Array<[number, number, number, number]>) {
  const scene = new THREE.Scene();
  const N = 5200;
  const R = rng(8);
  // sample the icon shape
  const c = document.createElement("canvas");
  c.width = c.height = 400;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#fff";
  g.beginPath();
  g.lineWidth = 16;
  g.roundRect(60, 60, 280, 280, 70);
  g.stroke();
  mailGlyph(g, 200, 205, 80, 16);
  const img = g.getImageData(0, 0, 400, 400).data;
  const iconPts: Array<[number, number]> = [];
  for (let y = 0; y < 400; y += 2) for (let x = 0; x < 400; x += 2) if (img[(y * 400 + x) * 4 + 3] > 128) iconPts.push([(x - 200) * 2.3, (200 - y) * 2.3]);
  // sample the interface outline (stage px → centred units)
  const per = uiRects.map(([, , w, h]) => 2 * (w + h));
  const total = per.reduce((a, b) => a + b, 0);
  const uiPt = () => {
    let d = R() * total;
    let k = 0;
    while (d > per[k]) d -= per[k++];
    const [x, y, w, h] = uiRects[k];
    let px: number;
    let py: number;
    if (d < w) [px, py] = [x + d, y];
    else if (d < w + h) [px, py] = [x + w, y + d - w];
    else if (d < 2 * w + h) [px, py] = [x + w - (d - w - h), y + h];
    else [px, py] = [x, y + h - (d - 2 * w - h)];
    return [px - W / 2 + (R() - 0.5) * 3, H / 2 - py + (R() - 0.5) * 3];
  };
  const a0 = new Float32Array(N * 3);
  const a1 = new Float32Array(N * 3);
  const a2 = new Float32Array(N * 3);
  const ar = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const p = iconPts[Math.floor(R() * iconPts.length)];
    a0.set([p[0] + (R() - 0.5) * 6, p[1] + (R() - 0.5) * 6, 0], i * 3);
    // an expanding shell of light, with a denser core
    const u = R() * 2 - 1;
    const ang = R() * Math.PI * 2;
    const sq = Math.sqrt(1 - u * u);
    const shell = R() < 0.7;
    const rad = shell ? 330 + R() * 120 : 60 + R() * 260;
    a1.set([sq * Math.cos(ang) * rad, u * rad, sq * Math.sin(ang) * rad], i * 3);
    const q = uiPt();
    a2.set([q[0], q[1], 0], i * 3);
    ar[i] = R();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(a0, 3));
  geo.setAttribute("aB", new THREE.BufferAttribute(a1, 3));
  geo.setAttribute("aT", new THREE.BufferAttribute(a2, 3));
  geo.setAttribute("aR", new THREE.BufferAttribute(ar, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uBurst: { value: 0 }, uForm: { value: 0 }, uA: { value: 1 }, uT: { value: 0 } },
    vertexShader: `attribute vec3 aB; attribute vec3 aT; attribute float aR; uniform float uBurst; uniform float uForm; uniform float uT; varying float vR; varying float vK;
      void main(){ float b = uBurst; float f = clamp((uForm - aR * 0.35) / 0.65, 0.0, 1.0); f = f * f * (3.0 - 2.0 * f);
        vec3 p = mix(position, aB * (0.7 + 0.5 * b), b);
        float sw = b * (1.0 - f) * 2.4 * (aR - 0.5);
        p.xy = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xy;
        p = mix(p, aT, f);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        vR = aR; vK = f; gl_PointSize = min(7.0, (1.6 + 2.6 * aR) * (1.0 + 0.6 * b * (1.0 - f)) * (1500.0 / -mv.z)); }`,
    fragmentShader: `uniform float uA; varying float vR; varying float vK; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(0.4, 0.72, 1.0), vec3(0.95, 0.98, 1.0), vR * 0.6 + vK * 0.4); gl_FragColor = vec4(c * a * uA * 1.5, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(geo, mat));
  const cam = new THREE.PerspectiveCamera(40, W / H, 1, 10000);
  cam.position.set(0, 0, H / 2 / Math.tan((20 * Math.PI) / 180));
  cam.lookAt(0, 0, 0);
  const st = stars(300, 5000, 5);
  scene.add(st.pts);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("110,170,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(1400, 1400, 1);
  scene.add(glow);
  return { scene, cam, mat, st, glow };
}

// ── the network of light around the planet ────────────────────────────────
function network(grp: THREE.Group) {
  const R = rng(55);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 52; i++) {
    const u = R() * 1.7 - 0.85;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pts.push(new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)));
  }
  const mats: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < 110; i++) {
    const a = pts[i % pts.length];
    const b = pts[(i * 7 + 3 + Math.floor(i / pts.length) * 11) % pts.length];
    if (a.angleTo(b) < 0.2 || a.angleTo(b) > 2.2) continue;
    const mid = a.clone().add(b).normalize().multiplyScalar(1.0 + 0.12 + a.angleTo(b) * 0.12);
    const curve = new THREE.QuadraticBezierCurve3(a.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004));
    const m = new THREE.ShaderMaterial({
      uniforms: { uP: { value: 0 }, uA: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uP; uniform float uA; varying float vU; void main(){ float on = step(vU, uP); float head = exp(-abs(vU - uP) * 30.0); gl_FragColor = vec4(vec3(0.4, 0.75, 1.0) * (on * 0.8 + head * 1.6) * uA, 1.0); }`,
    });
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.005, 6, false), m));
    mats.push(m);
  }
  const nodeTex = glowTex("140,200,255");
  const nodes: THREE.Sprite[] = pts.map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nodeTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.position.copy(p.clone().multiplyScalar(1.01));
    s.scale.set(0.06, 0.06, 1);
    grp.add(s);
    return s;
  });
  return { mats, nodes };
}

// ─────────────────────────────────────────────────────────────────────────
export const UI_RECTS: Array<[number, number, number, number]> = [
  [240, 150, 1440, 800], // window
  [240, 150, 250, 800], // sidebar
  [490, 150, 1190, 96], // header
  [1300, 290, 340, 140], // trays
  [1300, 450, 340, 140],
  [1300, 610, 340, 140],
  [1300, 770, 340, 140],
];

/** Screen-space anchors the DOM layer follows (updated by the GL frame, which runs first). */
export const hud = { x: 0, y: 0, on: 0, scale: 1, lanes: [] as Array<{ x: number; y: number; z: number }> };
const toScreen = (v: THREE.Vector3, c: THREE.Camera) => {
  const p = v.clone().project(c);
  return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z };
};

export interface GL {
  project(v: THREE.Vector3, cam: THREE.Camera): { x: number; y: number; z: number };
  swarm: ReturnType<typeof swarm>;
}

export function initGL(): GL {
  const canvas = $<HTMLCanvasElement>("#gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x010208, 1);

  // space
  const space = new THREE.Scene();
  const st = stars(7000, 600, 1);
  space.add(st.pts);
  const nebula = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("40,80,220"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  nebula.scale.set(500, 300, 1);
  nebula.position.set(-150, 60, -400);
  space.add(nebula);
  const pl = planet();
  space.add(pl.grp);
  const sigTex = signalTex();
  // the signal on the surface
  const sigDir = new THREE.Vector3(0.42, 0.36, 0.83).normalize();
  const sig = new THREE.Group();
  const sigSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sigTex, transparent: true, depthWrite: false, depthTest: false }));
  sigSprite.scale.set(0.16, 0.16, 1);
  const sigGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sigGlow.scale.set(0.5, 0.5, 1);
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    return m;
  });
  const beamUp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.6, 8, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vU; void main(){ gl_FragColor = vec4(vec3(0.5, 0.8, 1.0) * vU.y, 1.0); }`,
    }),
  );
  beamUp.position.y = 0.3;
  const ringHolder = new THREE.Group();
  rings.forEach((r) => ringHolder.add(r));
  ringHolder.add(beamUp);
  sig.add(ringHolder, sigGlow, sigSprite);
  sig.position.copy(sigDir.clone().multiplyScalar(1.02));
  ringHolder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sigDir);
  rings.forEach((r) => r.rotation.set(Math.PI / 2, 0, 0));
  pl.grp.add(sig);
  const net = network(pl.grp);
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.001, 2000);

  const ct = city(sigTex);
  const fx = particles(UI_RECTS);
  const sw = swarm();
  // backdrop for the interface scenes
  const back = new THREE.Scene();
  const bst = stars(5000, 800, 3);
  back.add(bst.pts);
  const backGlows = [
    [-260, 80, -500, 700, "40,90,255", 0.5],
    [300, -160, -600, 900, "20,60,200", 0.45],
    [0, 260, -700, 600, "90,160,255", 0.25],
  ].map(([x, y, z, s, c, o]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c as string), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o as number }));
    sp.position.set(x as number, y as number, z as number);
    sp.scale.set(s as number, (s as number) * 0.7, 1);
    back.add(sp);
    return sp;
  });
  const bcam = new THREE.PerspectiveCamera(50, W / H, 1, 5000);

  const fog = $("#fog");
  const tmpV = new THREE.Vector3();

  onFrame((t) => {
    // ── space: intro orbit, the signal, the dive ──────────────────────────
    if (t < T.city || t >= T.back) {
      pl.grp.rotation.y = 0.35 + t * 0.018;
      pl.surf.uniforms.uT.value = t;
      pl.clouds.uniforms.uT.value = t;
      st.mat.uniforms.uT.value = t;
      pl.grp.updateMatrixWorld(true);
      const sigW = sig.getWorldPosition(tmpV).clone();
      if (t < T.back) {
        // emergence: from total dark, the rim of light first
        const rev = smooth(P(t, T.planet, 3.2));
        pl.surf.uniforms.uCity.value = 0.4 + 0.8 * smooth(P(t, 1.5, 4));
        pl.atm.uniforms.uA.value = rev;
        st.mat.uniforms.uA.value = smooth(P(t, 0, 1.6));
        // a slow orbit, closing in
        const a = lerp(-0.55, 0.15, ease.io3(P(t, 0, T.dive)));
        const r = lerp(4.6, 3.3, ease.out3(P(t, 0, T.dive)));
        const orbit = new THREE.Vector3(Math.sin(a) * r, lerp(0.9, 0.55, P(t, 0, T.dive)), Math.cos(a) * r);
        const look0 = new THREE.Vector3(0.0, 0.05, 0);
        // notice: the aim drifts toward the signal
        const look1 = sigW.clone().multiplyScalar(0.6);
        const aim = smooth(P(t, T.notice - 0.3, T.dive));
        let pos = orbit;
        let look = look0.clone().lerp(look1, aim);
        let fov = 32;
        if (t >= T.dive) {
          // the dive: accelerate straight down onto the signal
          const k = ease.in3(P(t, T.dive, T.city));
          const above = sigW.clone().normalize().multiplyScalar(1.03);
          pos = orbit.clone().lerp(above, k);
          look = look1.clone().lerp(sigW, smooth(P(t, T.dive, T.dive + 0.4)));
          fov = lerp(32, 70, ease.in3(P(t, T.dive + 0.3, T.city)));
        }
        cam.position.copy(pos);
        cam.fov = fov;
        cam.updateProjectionMatrix();
        cam.lookAt(look);
        cam.rotateZ(lerp(-0.08, 0.04, P(t, 0, T.city)));
        // the signal
        const sOn = smooth(P(t, T.signal, T.signal + 0.4));
        sigSprite.material.opacity = sOn;
        sigGlow.material.opacity = sOn * (0.7 + 0.3 * Math.sin(t * 8));
        rings.forEach((rg, i) => {
          const ph = ((t - T.signal) * 0.8 + i / 3) % 1;
          const s = 0.04 + ph * 0.28;
          rg.scale.set(s, s, s);
          (rg.material as THREE.MeshBasicMaterial).opacity = t > T.signal ? (1 - ph) * 0.9 : 0;
        });
        beamUp.scale.y = sOn;
        cam.updateMatrixWorld();
        const sp = toScreen(sigW, cam);
        hud.x = sp.x;
        hud.y = sp.y;
        hud.on = sp.z < 1 ? 1 : 0;
        hud.scale = 1 / Math.max(0.05, cam.position.distanceTo(sigW));
        pl.clouds.uniforms.uA.value = 1;
        net.mats.forEach((m) => (m.uniforms.uA.value = 0));
        net.nodes.forEach((n) => (n.material.opacity = 0));
        // whiteout as we cross the atmosphere
        fog.style.opacity = (smooth(P(t, T.atmos - 0.15, T.city)) * 0.95).toFixed(3);
      } else {
        // ── the return: the planet, connected ──────────────────────────────
        const k = ease.out5(P(t, T.back, T.back + 2.2));
        const k2 = ease.io3(P(t, T.logo - 0.6, T.logo + 1.8));
        const a = lerp(0.35, -0.25, P(t, T.back, T.end));
        const r = lerp(lerp(1.35, 3.4, k), 6.2, k2);
        cam.position.set(Math.sin(a) * r, lerp(0.5, 0.75, k2), Math.cos(a) * r);
        cam.fov = lerp(55, 34, k);
        cam.updateProjectionMatrix();
        cam.lookAt(new THREE.Vector3(0, lerp(0, 1.62, k2), 0));
        pl.atm.uniforms.uA.value = 1.2;
        pl.surf.uniforms.uCity.value = 1.6;
        st.mat.uniforms.uA.value = 1;
        sigSprite.material.opacity = 0;
        sigGlow.material.opacity = 0;
        rings.forEach((rg) => ((rg.material as THREE.MeshBasicMaterial).opacity = 0));
        beamUp.scale.y = 0.001;
        net.mats.forEach((m, i) => {
          m.uniforms.uP.value = ease.out3(P(t, T.net + (i % 40) * 0.035, T.net + 1.3 + (i % 40) * 0.035));
          m.uniforms.uA.value = 1;
        });
        net.nodes.forEach((n, i) => (n.material.opacity = smooth(P(t, T.net + 0.3 + i * 0.02, T.net + 0.8 + i * 0.02)) * (0.7 + 0.3 * Math.sin(t * 3 + i))));
        fog.style.opacity = (1 - smooth(P(t, T.back, T.back + 0.5))).toFixed(3);
      }
      renderer.render(space, cam);
      return;
    }
    // ── the city: skim the lights, reach the beacon ─────────────────────────
    if (t < T.burst) {
      const k = P(t, T.city, T.flash);
      const e = ease.in3(k) * 0.65 + k * 0.35;
      const BZ = ct.BZ;
      ct.cam.position.set(Math.sin(k * 3) * 30 * (1 - k), lerp(420, 140, ease.out3(k)), lerp(1200, BZ + 70, e));
      ct.cam.fov = lerp(75, 50, k);
      ct.cam.updateProjectionMatrix();
      ct.cam.lookAt(0, lerp(60, 140, k), BZ);
      ct.cam.rotateZ(lerp(0.12, 0, k));
      fog.style.opacity = (Math.max(0, 0.95 - smooth(P(t, T.city, T.city + 0.35)) * 0.95) + smooth(P(t, T.flash - 0.12, T.flash)) * 0.9).toFixed(3);
      ct.cam.updateMatrixWorld();
      const bp = toScreen(new THREE.Vector3(0, 140, BZ), ct.cam);
      hud.x = bp.x;
      hud.y = bp.y;
      hud.on = bp.z < 1 ? 1 : 0;
      hud.scale = 100 / Math.max(1, ct.cam.position.distanceTo(new THREE.Vector3(0, 140, BZ)));
      renderer.render(ct.scene, ct.cam);
      return;
    }
    // ── particles: the icon bursts and rebuilds the interface ──────────────
    if (t < T.ui + 0.6) {
      fx.mat.uniforms.uBurst.value = ease.out3(P(t, T.burst + 0.2, T.form + 0.3));
      fx.st.mat.uniforms.uA.value = 0.35;
      fx.glow.material.opacity = Math.max(0, 1 - P(t, T.burst + 0.1, T.form)) * 0.9 + 0.25 * Math.sin(P(t, T.form, T.ui + 0.4) * Math.PI);
      fx.mat.uniforms.uForm.value = ease.io3(P(t, T.form, T.ui + 0.1));
      fx.mat.uniforms.uA.value = 1 - smooth(P(t, T.ui + 0.1, T.ui + 0.55));
      fx.st.mat.uniforms.uT.value = t;
      fx.cam.position.z = H / 2 / Math.tan((20 * Math.PI) / 180) + (1 - ease.out3(P(t, T.burst, T.form))) * -500;
      fx.scene.rotation.y = 0.4 * Math.sin(Math.PI * P(t, T.burst, T.ui + 0.05));
      fx.scene.rotation.z = 0.25 * Math.sin(Math.PI * P(t, T.burst, T.ui + 0.05));
      fx.cam.updateMatrixWorld();
      fog.style.opacity = (1 - smooth(P(t, T.burst, T.burst + 0.14))).toFixed(3);
      renderer.render(fx.scene, fx.cam);
      return;
    }
    fog.style.opacity = "0";
    // ── the swarm: chaos → wave → order → tunnel ───────────────────────────
    if (t >= T.wow && t < T.dash) {
      const s = sw;
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e3 = new THREE.Euler();
      const sc = new THREE.Vector3(1, 1, 1);
      const waveR = ease.out3(P(t, T.wave, T.wave + 1.1)) * 4200;
      const camPos = new THREE.Vector3();
      // camera
      if (t < T.tunnel) {
        const k = P(t, T.wow, T.sort);
        const a = lerp(0.5, -0.15, k);
        const r = lerp(2400, 1500, ease.out3(k));
        camPos.set(Math.sin(a) * r, lerp(500, 120, k), Math.cos(a) * r);
        const k2 = ease.io3(P(t, T.sort, T.tunnel));
        camPos.lerp(new THREE.Vector3(0, 0, 1350), k2);
        s.cam.position.copy(camPos);
        s.cam.fov = 50;
        s.cam.lookAt(0, 0, lerp(0, -400, k2));
        // shake as the chaos builds, a punch on the wave
        const shake = smooth(P(t, T.overload, T.core)) * (t < T.wave ? 1 : Math.exp(-(t - T.wave) * 3)) * 8;
        s.cam.position.x += Math.sin(t * 41) * shake;
        s.cam.position.y += Math.sin(t * 37 + 1) * shake;
      } else {
        const k = ease.in3(P(t, T.tunnel, T.dash));
        s.cam.position.set(0, 0, lerp(1350, -4800, k));
        s.cam.fov = lerp(50, 95, k);
        s.cam.lookAt(0, 0, s.cam.position.z - 1000);
        s.cam.rotateZ(k * 0.9);
      }
      s.cam.updateProjectionMatrix();
      const sortK = (i: number) => {
        const d = s.ch[i].r1;
        return ease.io3(P(t, T.sort + d / 4200 * 0.6, T.sort + 0.9 + d / 4200 * 0.6 + (i % 7) * 0.02));
      };
      for (let i = 0; i < s.N; i++) {
        const c = s.ch[i];
        // chaos: spiralling in from far away, tumbling
        const k = ease.out3(P(t, T.wow - 0.4 + (i % 17) * 0.02, T.core));
        const r = lerp(c.r0, c.r1, k);
        const ang = c.sp * (t - T.wow) * 0.6 + c.ph;
        const pos = c.d.clone().multiplyScalar(r).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang * 0.4);
        pos.y += Math.sin(t * 1.3 + c.ph) * 40;
        e3.set(c.tilt * Math.sin(t + c.ph), Math.atan2(pos.x, pos.z) + Math.sin(t * 0.7 + c.ph) * 0.6, c.tilt);
        q.setFromEuler(e3);
        // order: into its lane
        const sk = sortK(i);
        if (sk > 0) {
          pos.lerp(s.targets[i], sk);
          q.slerp(new THREE.Quaternion(), sk);
        }
        m4.compose(pos, q, sc);
        s.mesh.setMatrixAt(i, m4);
        const passed = waveR > pos.length() ? Math.exp(-((waveR - pos.length()) / 900)) : 0;
        s.aFl[i] = Math.max(passed, t > T.tunnel ? 0.25 : 0);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
      s.flAttr.needsUpdate = true;
      s.mat.uniforms.uSort.value = smooth(P(t, T.sort, T.sort + 1.2));
      // the core ignites
      const ign = smooth(P(t, T.core, T.wave));
      const coreS = 1.1 + ign * 1.4 + Math.sin(t * 6) * 0.05;
      s.ring.scale.set(coreS, coreS, coreS);
      (s.ring.material as THREE.MeshBasicMaterial).opacity = 0.35 + ign * 0.65;
      s.coreGlow.scale.set(600 + ign * 2600 * Math.exp(-Math.max(0, t - T.wave) * 2), 600 + ign * 2600 * Math.exp(-Math.max(0, t - T.wave) * 2), 1);
      s.core.visible = t < T.tunnel + 0.4;
      s.core.lookAt(s.cam.position);
      s.wave.scale.setScalar(Math.max(1, waveR));
      (s.wave.material as THREE.ShaderMaterial).uniforms.uA.value = t >= T.wave ? 1 - P(t, T.wave, T.wave + 1.1) : 0;
      s.waveRing.scale.setScalar(Math.max(1, waveR * 0.9));
      (s.waveRing.material as THREE.MeshBasicMaterial).opacity = t >= T.wave ? 1 - P(t, T.wave, T.wave + 1.0) : 0;
      s.laneLines.forEach((l, k) => ((l.material as THREE.LineBasicMaterial).opacity = smooth(P(t, T.sort + 0.4 + k * 0.08, T.sort + 1.0 + k * 0.08)) * 0.9));
      s.st.mat.uniforms.uT.value = t;
      s.cam.updateMatrixWorld();
      hud.lanes = LANES.map((_, k) => {
        const th = Math.PI / 2 + (k * Math.PI * 2) / 5;
        return toScreen(new THREE.Vector3(Math.cos(th) * (s.RAD + 230), Math.sin(th) * (s.RAD + 230), 200), s.cam);
      });
      renderer.render(s.scene, s.cam);
      return;
    }
    // ── the backdrop behind the interface ──────────────────────────────────
    bst.mat.uniforms.uT.value = t;
    bcam.position.set(Math.sin(t * 0.15) * 60, Math.cos(t * 0.11) * 30, 400 - (t % 20) * 4);
    bcam.lookAt(0, 0, -500);
    backGlows.forEach((g, i) => g.material.rotation = t * 0.05 * (i % 2 ? 1 : -1));
    renderer.render(back, bcam);
  });

  return {
    swarm: sw,
    project(v, c) {
      const p = v.clone().project(c);
      return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H, z: p.z };
    },
  };
}
