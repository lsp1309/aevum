import * as THREE from "three";
import { onFrame, clamp, smooth, lerp, rng } from "../core/clock";
import { T } from "./timing";
import { W, H, $ } from "./stage";

/**
 * The 3D world of the TikTok film (Three.js), a pure function of time:
 *   space  — an eclipse sunrise over a blue planet, the notification on its
 *            night side, the dive; at the end the same planet, wired with light
 *   city   — a spiral descent down a column of light to the beacon
 *   holo   — the flood of messages, then the holographic analysis tower
 *   back   — a quiet backdrop for the interface scenes
 */
const ease = {
  in3: (x: number) => x * x * x,
  out3: (x: number) => 1 - Math.pow(1 - x, 3),
  io3: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out5: (x: number) => 1 - Math.pow(1 - x, 5),
};
const P = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ASPECT = W / H;

const NOISE = `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; } return v; }
`;

// ── textures ─────────────────────────────────────────────────────────────
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function mailGlyph(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, lw: number) {
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
const glowTex = (rgb = "120,180,255") =>
  canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, `rgba(${rgb},1)`);
    gr.addColorStop(0.2, `rgba(${rgb},0.45)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
  });
/** The notification: a glass tile with the mail glyph and a "1" badge. */
const pinTex = () =>
  canvasTex(512, 512, (g) => {
    const gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    gr.addColorStop(0, "rgba(140,200,255,0.85)");
    gr.addColorStop(0.3, "rgba(60,130,255,0.45)");
    gr.addColorStop(1, "rgba(20,60,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = "rgba(12,32,110,0.9)";
    g.beginPath();
    g.roundRect(150, 150, 212, 212, 54);
    g.fill();
    g.strokeStyle = "#eaf4ff";
    g.shadowColor = "#7fc4ff";
    g.shadowBlur = 24;
    g.lineWidth = 9;
    g.beginPath();
    g.roundRect(150, 150, 212, 212, 54);
    g.stroke();
    mailGlyph(g, 256, 262, 58, 11);
    g.shadowBlur = 18;
    g.fillStyle = "#3d7bff";
    g.beginPath();
    g.arc(352, 160, 42, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "800 50px Manrope Variable, sans-serif";
    g.textAlign = "center";
    g.fillText("1", 352, 178);
  });
/** An anamorphic streak for the sun. */
const streakTex = () =>
  canvasTex(1024, 64, (g) => {
    const gr = g.createLinearGradient(0, 0, 1024, 0);
    gr.addColorStop(0, "rgba(90,150,255,0)");
    gr.addColorStop(0.5, "rgba(220,238,255,1)");
    gr.addColorStop(1, "rgba(90,150,255,0)");
    g.fillStyle = gr;
    const v = g.createLinearGradient(0, 0, 0, 64);
    g.fillRect(0, 24, 1024, 16);
    v.addColorStop(0, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-in";
    const r = g.createRadialGradient(512, 32, 0, 512, 32, 32);
    r.addColorStop(0, "rgba(0,0,0,1)");
    r.addColorStop(1, "rgba(0,0,0,0)");
    g.setTransform(16, 0, 0, 1, -512 * 15, 0);
    g.fillStyle = r;
    g.fillRect(0, 0, 1024, 64);
  });

// ── stars ────────────────────────────────────────────────────────────────
function stars(n: number, r: number, seed: number) {
  const R = rng(seed);
  const pos = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const tw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const band = R() < 0.45 ? 0.2 : 1;
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

// ── the planet, lit from behind ──────────────────────────────────────────
function planet() {
  const grp = new THREE.Group();
  const sun = new THREE.Vector3(0, 0.3, -1).normalize();
  const surf = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uCity: { value: 1 } },
    vertexShader: `varying vec3 vN; varying vec3 vNW; varying vec3 vPW;
      void main(){ vN = normal; vNW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vPW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${NOISE}
      uniform vec3 uSun; uniform float uCity; varying vec3 vN; varying vec3 vNW; varying vec3 vPW;
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
        float day = smoothstep(-0.15, 0.4, dl);
        vec3 lit = col * (0.15 + 1.2 * max(dl, 0.0));
        vec3 c = mix(col * 0.05 + vec3(0.003, 0.007, 0.02), lit, day);
        vec3 Rf = reflect(-uSun, N);
        c += vec3(0.6, 0.8, 1.0) * pow(max(dot(Rf, V), 0.0), 90.0) * day * (1.0 - coast) * 0.45;
        float cl = smoothstep(0.55, 0.75, fbm(n * 7.0 + 11.0)) * coast;
        float pts = pow(vnoise(n * 140.0), 6.0) * 6.0 + pow(vnoise(n * 60.0), 4.0) * 1.5;
        c += vec3(0.42, 0.72, 1.0) * cl * pts * (1.0 - day) * uCity;
        float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
        // light wrapping around the limb when the sun is behind
        float back = pow(max(dot(-V, uSun), 0.0), 3.0);
        c += vec3(0.15, 0.4, 1.0) * fr * (0.2 + 0.9 * smoothstep(-0.3, 0.5, dl) + 2.2 * back * smoothstep(-0.35, 0.1, dl));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 160, 120), surf);
  const clouds = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uT: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vNW; void main(){ vN = normal; vNW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `${NOISE} uniform vec3 uSun; uniform float uT; varying vec3 vN; varying vec3 vNW;
      void main(){ vec3 n = normalize(vN); float d = fbm(n * 3.2 + vec3(uT * 0.01, 0.0, 0.0) + fbm(n * 6.0) * 0.8);
        float a = smoothstep(0.52, 0.78, d) * 0.75;
        float dl = dot(normalize(vNW), uSun); float day = smoothstep(-0.2, 0.5, dl);
        vec3 c = mix(vec3(0.03, 0.07, 0.18), vec3(0.8, 0.9, 1.0) * (0.35 + 0.8 * max(dl, 0.0)), day);
        gl_FragColor = vec4(c, a); }`,
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
        float lit = 0.35 + 0.9 * smoothstep(-0.4, 0.6, dot(N, uSun));
        // forward scattering: the backlit rim blazes
        float fwd = pow(max(dot(-V, uSun), 0.0), 4.0) * smoothstep(-0.6, 0.3, dot(N, uSun));
        vec3 c = mix(vec3(0.08, 0.3, 1.0), vec3(0.6, 0.88, 1.0), a) * a * 1.6 * (lit + 3.0 * fwd);
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

// ── the planet's network of light ───────────────────────────────────────
function network(grp: THREE.Group) {
  const R = rng(55);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 56; i++) {
    const u = R() * 1.7 - 0.85;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pts.push(new THREE.Vector3(s * Math.cos(a), u, s * Math.sin(a)));
  }
  const mats: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < 130; i++) {
    const a = pts[i % pts.length];
    const b = pts[(i * 7 + 3 + Math.floor(i / pts.length) * 11) % pts.length];
    if (a.angleTo(b) < 0.2 || a.angleTo(b) > 2.2) continue;
    const mid = a.clone().add(b).normalize().multiplyScalar(1.12 + a.angleTo(b) * 0.12);
    const curve = new THREE.QuadraticBezierCurve3(a.clone().multiplyScalar(1.004), mid, b.clone().multiplyScalar(1.004));
    const m = new THREE.ShaderMaterial({
      uniforms: { uP: { value: 0 }, uA: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uP; uniform float uA; varying float vU; void main(){ float on = step(vU, uP); float head = exp(-abs(vU - uP) * 30.0); gl_FragColor = vec4(vec3(0.4, 0.75, 1.0) * (on * 0.8 + head * 1.6) * uA, 1.0); }`,
    });
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.003, 6, false), m));
    mats.push(m);
  }
  const nodeTex = glowTex("140,200,255");
  const nodes = pts.map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: nodeTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.position.copy(p.clone().multiplyScalar(1.01));
    s.scale.set(0.06, 0.06, 1);
    grp.add(s);
    return s;
  });
  return { mats, nodes };
}

// ── the night city, seen from above ──────────────────────────────────────
function city(pin: THREE.Texture) {
  const scene = new THREE.Scene();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(12000, 12000),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `${NOISE} varying vec3 vP;
        void main(){ vec2 p = vP.xz;
          vec2 g = abs(fract(p / 70.0) - 0.5);
          float street = smoothstep(0.035, 0.0, min(g.x, g.y));
          vec2 g2 = abs(fract(p / 350.0) - 0.5);
          float avenue = smoothstep(0.012, 0.0, min(g2.x, g2.y));
          float lights = pow(vnoise(vec3(p * 0.25, 1.0)), 10.0) * 4.0;
          float d = length(p - vec2(0.0, -900.0));
          // light pulses running along the avenues toward the beacon
          float pulse = pow(0.5 + 0.5 * sin(d * 0.02 - 0.0), 12.0);
          vec3 c = vec3(0.004, 0.008, 0.02) + vec3(0.2, 0.45, 1.0) * street * 0.55 + vec3(0.6, 0.85, 1.0) * avenue * (1.2 + pulse) + vec3(0.5, 0.75, 1.0) * lights;
          c += vec3(0.1, 0.3, 1.0) * exp(-d / 420.0) * 0.9;
          float fog = exp(-length(cameraPosition - vec3(p.x, 0.0, p.y)) / 4200.0);
          gl_FragColor = vec4(c * fog + vec3(0.01, 0.025, 0.08) * (1.0 - fog), 1.0); }`,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
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
        vec3 c = vec3(0.012, 0.02, 0.05) + vec3(0.45, 0.72, 1.0) * win * on * 0.9 * (1.0 - step(0.5, vN.y));
        // rooftops: dark with a faint blue edge glow
        c += vec3(0.05, 0.14, 0.4) * step(0.5, vN.y) * 0.5;
        float fog = exp(-length(cameraPosition - vP) / 4000.0);
        gl_FragColor = vec4(c * fog + vec3(0.01, 0.025, 0.08) * (1.0 - fog), 1.0); }`,
  });
  const N = 900;
  const bld = new THREE.InstancedMesh(bGeo, bMat, N);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    const x = (R() * 2 - 1) * 2800;
    const z = -900 + (R() * 2 - 1) * 2800;
    if (Math.hypot(x, z + 900) < 160) continue;
    const w = 40 + R() * 70;
    const h = 30 + Math.pow(R(), 2) * 380 + (Math.hypot(x, z + 900) < 700 ? 90 : 0);
    m4.makeScale(w, h, w);
    m4.setPosition(Math.round(x / 70) * 70 + 35, 0, Math.round(z / 70) * 70 + 35);
    bld.setMatrixAt(i, m4);
  }
  scene.add(bld);
  const BZ = -900;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(10, 10, 1400, 24, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vU; void main(){ float a = (1.0 - vU.y) * 0.45 + 0.05; gl_FragColor = vec4(vec3(0.5, 0.78, 1.0) * a, 1.0); }`,
    }),
  );
  beam.position.set(0, 700, BZ);
  scene.add(beam);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(1100, 1100, 1);
  halo.position.set(0, 160, BZ);
  scene.add(halo);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: pin, transparent: true, depthWrite: false }));
  icon.scale.set(150, 150, 1);
  icon.position.set(0, 160, BZ);
  scene.add(icon);
  // light rings rising up the column
  const rings = [0, 1, 2, 3].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2;
    scene.add(r);
    return r;
  });
  const cam = new THREE.PerspectiveCamera(70, ASPECT, 1, 14000);
  return { scene, cam, BZ, rings, halo };
}

// ── the flood and the analysis tower ─────────────────────────────────────
const MSGS: Array<[string, string, string, string]> = [
  ["EB", "Eva Brunner · Alpine Supplies", "Contract renewal — confirmation needed", "mail"],
  ["MD", "Marc Dufour", "Invoice 4821 — payment status", "mail"],
  ["HK", "Helena Krug", "NDA — Lumen Labs engagement", "mail"],
  ["NK", "Nina Kovacs", "Shipment AT-8891 delayed", "mail"],
  ["SP", "Silo Pay", "Payment received — INV-4820", "mail"],
  ["PS", "Priya Shah", "Re: Q4 budget — final numbers?", "mail"],
  ["JF", "Jonas Frei", "Updated bank details", "mail"],
  ["CO", "Claire Osman", "Proposal v3 — waiting on your board", "mail"],
  ["SM", "Sofia Marin", "Can you send me the Q4 numbers?", "chat"],
  ["NK", "Northline kickoff", "Thursday 14:30 · Missed", "cal"],
  ["XL", "Q4 allocation.xlsx", "For Priya Shah · Needed by Friday", "file"],
  ["AF", "Atlas Freight", "AT-8891 — tracking update", "mail"],
  ["MC", "Maya Chen", "Expense report reminder", "mail"],
  ["NR", "Northline Retail", "Product newsletter — October", "mail"],
  ["HL", "Helios Legal", "September legal brief", "mail"],
];
function atlas() {
  return canvasTex(1024, 1024, (g) => {
    for (let i = 0; i < 30; i++) {
      const cx = (i % 3) * 341;
      const cy = Math.floor(i / 3) * 102;
      const [ini, who, what, kind] = MSGS[i % MSGS.length];
      const gr = g.createLinearGradient(0, cy, 0, cy + 96);
      gr.addColorStop(0, "#16213f");
      gr.addColorStop(1, "#0c1430");
      g.fillStyle = gr;
      g.beginPath();
      g.roundRect(cx + 3, cy + 3, 334, 94, 14);
      g.fill();
      g.strokeStyle = "rgba(150,190,255,0.32)";
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = kind === "mail" ? "#2f5fe0" : "#1d2c55";
      g.beginPath();
      g.arc(cx + 36, cy + 50, 19, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#eaf2ff";
      g.font = "700 13px Manrope Variable, sans-serif";
      g.textAlign = "center";
      g.fillText(ini, cx + 36, cy + 55);
      g.textAlign = "left";
      g.font = "700 17px Manrope Variable, sans-serif";
      g.fillText(who, cx + 66, cy + 42);
      g.fillStyle = "rgba(200,216,245,0.72)";
      g.font = "500 14px Manrope Variable, sans-serif";
      g.fillText(what, cx + 66, cy + 67);
      if (i < 15) {
        g.fillStyle = "#4d8dff";
        g.beginPath();
        g.arc(cx + 318, cy + 24, 5, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}
export const LEVELS = ["INCOMING", "ANALYZING", "UNDERSTANDING", "PRIORITIZING", "ACTION"];
const LY = [-760, -380, 0, 380, 760];
const TR = 430;
function holo() {
  const scene = new THREE.Scene();
  const N = 340;
  const R = rng(4821);
  const geo = new THREE.PlaneGeometry(340, 96);
  const aUV = new Float32Array(N * 2);
  const aFl = new Float32Array(N);
  const aLv = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = i % 30;
    aUV.set([(v % 3) * (341 / 1024), 1 - (Math.floor(v / 3) + 1) * (102 / 1024)], i * 2);
  }
  geo.setAttribute("aUV", new THREE.InstancedBufferAttribute(aUV, 2));
  const flA = new THREE.InstancedBufferAttribute(aFl, 1);
  const lvA = new THREE.InstancedBufferAttribute(aLv, 1);
  geo.setAttribute("aFl", flA);
  geo.setAttribute("aLv", lvA);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: atlas() }, uA: { value: 1 } },
    vertexShader: `attribute vec2 aUV; attribute float aFl; attribute float aLv; varying vec2 vUv; varying float vFl; varying float vLv; varying vec2 vQ;
      void main(){ vUv = aUV + uv * vec2(341.0 / 1024.0, 102.0 / 1024.0); vFl = aFl; vLv = aLv; vQ = uv;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uMap; uniform float uA; varying vec2 vUv; varying float vFl; varying float vLv; varying vec2 vQ;
      void main(){ vec4 c = texture2D(uMap, vUv); if (c.a < 0.05) discard;
        vec3 col = c.rgb;
        // each level of analysis re-tints the card: dim → cyan → white-hot
        vec3 tint = mix(vec3(0.55, 0.62, 0.8), mix(vec3(0.45, 0.85, 1.0), vec3(1.0), smoothstep(0.6, 1.0, vLv)), smoothstep(0.0, 0.4, vLv));
        col = mix(col, col * 0.85 + tint * 0.22, step(0.01, vLv));
        // scan line sweeping each card at every level
        col += vec3(0.5, 0.85, 1.0) * vFl * (0.5 + 0.8 * exp(-abs(vQ.y - fract(vFl * 3.0)) * 12.0));
        float edge = smoothstep(0.03, 0.0, min(min(vQ.x, 1.0 - vQ.x) * 3.5, min(vQ.y, 1.0 - vQ.y)));
        col += vec3(0.4, 0.75, 1.0) * edge * vLv * 0.6;
        gl_FragColor = vec4(col * uA, c.a * uA); }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, N);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const card = Array.from({ length: N }, (_, i) => {
    const u = R() * 2 - 1;
    const a = R() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return {
      d: new THREE.Vector3(s * Math.cos(a), u * 1.5, s * Math.sin(a) * 0.6),
      r1: 560 + R() * 900,
      arrive: T.flood + 0.3 + Math.pow(i / N, 0.8) * (T.tower - T.flood - 0.9),
      ph: R() * 6.28,
      sp: (R() < 0.5 ? -1 : 1) * (0.25 + R() * 0.5),
      tilt: (R() - 0.5) * 1.2,
      enter: T.tower + 0.4 + (i / N) * 3.3 + R() * 0.1,
      phi: R() * Math.PI * 2,
    };
  });
  // the tower
  const tower = new THREE.Group();
  scene.add(tower);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  const tickMats: THREE.MeshBasicMaterial[] = [];
  LY.forEach((y) => {
    const m = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
    const r = new THREE.Mesh(new THREE.RingGeometry(TR - 6, TR, 160), m);
    r.rotation.x = -Math.PI / 2;
    r.position.y = y;
    const tm = new THREE.MeshBasicMaterial({ color: 0x5f9dff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0 });
    // tick marks: a dashed outer ring
    const tg = new THREE.RingGeometry(TR + 22, TR + 34, 240, 1, 0, Math.PI * 2);
    const ticks = new THREE.Mesh(tg, tm);
    ticks.rotation.x = -Math.PI / 2;
    ticks.position.y = y;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(TR, 96),
      new THREE.ShaderMaterial({
        uniforms: { uA: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uA; varying vec2 vU; void main(){ float r = length(vU - 0.5) * 2.0; float g = smoothstep(0.6, 1.0, r) * 0.5 + 0.5 * pow(1.0 - abs(fract(r * 8.0) - 0.5) * 2.0, 20.0) * smoothstep(1.0, 0.2, r);
          gl_FragColor = vec4(vec3(0.25, 0.55, 1.0) * g * uA * 0.35, 1.0); }`,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = y;
    tower.add(r, ticks, disc);
    ringMats.push(m);
    tickMats.push(tm);
    (disc.material as THREE.ShaderMaterial).userData.disc = true;
    ringMats[ringMats.length - 1].userData.disc = disc.material;
  });
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(TR, TR, 1800, 96, 1, true),
    new THREE.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uT: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uA; uniform float uT; varying vec2 vU;
        void main(){ float stripes = pow(1.0 - abs(fract(vU.x * 48.0) - 0.5) * 2.0, 30.0);
          float scan = pow(1.0 - abs(fract(vU.y * 22.0 - uT * 0.8) - 0.5) * 2.0, 16.0);
          float fade = smoothstep(0.0, 0.12, vU.y) * smoothstep(1.0, 0.85, vU.y);
          gl_FragColor = vec4(vec3(0.25, 0.55, 1.0) * (stripes * 0.35 + scan * 0.25) * fade * uA, 1.0); }`,
    }),
  );
  tower.add(cyl);
  const spine = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3, 1800, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }),
  );
  tower.add(spine);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("120,180,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  core.position.set(0, LY[4] + 40, 0);
  core.scale.set(500, 500, 1);
  tower.add(core);
  const st = stars(4000, 7000, 17);
  scene.add(st.pts);
  const glows = [
    [-600, 400, -2500, 2600, "40,90,255", 0.35],
    [700, -700, -2800, 3000, "20,60,200", 0.3],
  ].map(([x, y, z, s, c, o]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c as string), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o as number }));
    sp.position.set(x as number, y as number, z as number);
    sp.scale.set(s as number, s as number, 1);
    scene.add(sp);
    return sp;
  });
  void glows;
  const cam = new THREE.PerspectiveCamera(55, ASPECT, 1, 20000);
  return { scene, cam, mesh, card, aFl, aLv, flA, lvA, mat, N, ringMats, tickMats, cyl, spine, core, st };
}

/** Screen-space anchors the DOM layer follows (the GL frame runs first). */
export const hud = {
  x: 0,
  y: 0,
  on: 0,
  size: 0,
  levels: [] as Array<{ x: number; y: number; z: number }>,
};
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

  // ── space ────────────────────────────────────────────────────────────
  const space = new THREE.Scene();
  const st = stars(7000, 600, 1);
  space.add(st.pts);
  const pl = planet();
  space.add(pl.grp);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("200,225,255"), blending: THREE.AdditiveBlending, depthWrite: true, transparent: true }));
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("255,255,255"), blending: THREE.AdditiveBlending, depthWrite: true, transparent: true }));
  const streak = new THREE.Sprite(new THREE.SpriteMaterial({ map: streakTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  space.add(sunGlow, sunCore, streak);
  const pin = pinTex();
  const sigDir = new THREE.Vector3(0.62, 0.22, 0.75).normalize();
  const sig = new THREE.Group();
  const sigSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: pin, transparent: true, depthWrite: false, depthTest: false }));
  sigSprite.scale.set(0.15, 0.15, 1);
  const ripples = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96), new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    return m;
  });
  const rippleHolder = new THREE.Group();
  ripples.forEach((r) => {
    r.rotation.x = Math.PI / 2;
    rippleHolder.add(r);
  });
  rippleHolder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sigDir);
  rippleHolder.position.copy(sigDir.clone().multiplyScalar(1.004));
  sig.add(sigSprite);
  sig.position.copy(sigDir.clone().multiplyScalar(1.03));
  pl.grp.add(sig, rippleHolder);
  const net = network(pl.grp);
  const cam = new THREE.PerspectiveCamera(50, ASPECT, 0.001, 2000);

  const ct = city(pin);
  const hl = holo();
  // backdrop for the interface scenes
  const back = new THREE.Scene();
  const bst = stars(5000, 900, 3);
  back.add(bst.pts);
  const backGlows = (
    [
      [-200, 300, -600, 900, "40,90,255", 0.45],
      [250, -400, -700, 1100, "20,60,200", 0.45],
      [0, 0, -800, 700, "90,160,255", 0.2],
    ] as Array<[number, number, number, number, string, number]>
  ).map(([x, y, z, s, c, o]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: o }));
    sp.position.set(x, y, z);
    sp.scale.set(s, s * 1.3, 1);
    back.add(sp);
    return sp;
  });
  const bcam = new THREE.PerspectiveCamera(55, ASPECT, 1, 5000);
  const fog = $("#fog");
  const tmp = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e3 = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const sc = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0);

  const setSun = (elev: number, az: number) => {
    const d = new THREE.Vector3(Math.sin(az) * Math.cos(elev), Math.sin(elev), -Math.cos(az) * Math.cos(elev));
    pl.sun.copy(d);
    sunGlow.position.copy(d).multiplyScalar(60);
    sunCore.position.copy(d).multiplyScalar(60);
    streak.position.copy(d).multiplyScalar(60);
  };

  onFrame((t) => {
    // ── space: sunrise, the planet, the signal, the dive / the return ──
    if (t < T.city || t >= T.pullout) {
      pl.clouds.uniforms.uT.value = t;
      st.mat.uniforms.uT.value = t;
      pl.grp.rotation.y = 0.2 + t * 0.012;
      pl.grp.updateMatrixWorld(true);
      const sigW = sig.getWorldPosition(tmp).clone();
      if (t < T.city) {
        // the sun climbs over the limb (eclipse), then the camera swings out
        const rise = ease.out3(P(t, 0.2, 2.4));
        const kS = ease.io3(P(t, T.reveal, T.dive));
        setSun(lerp(lerp(0.5, 0.7, rise), 0.4, kS), lerp(lerp(-0.05, 0.05, rise), 1.35, kS));
        const sunOn = smooth(P(t, 0.1, 1.2));
        const flare = Math.exp(-Math.pow((t - 1.55) / 0.55, 2));
        sunGlow.scale.setScalar(lerp(8, 26, sunOn) + flare * 30);
        sunGlow.material.opacity = sunOn * 0.9;
        sunCore.scale.setScalar(3 + flare * 6);
        sunCore.material.opacity = sunOn;
        streak.scale.set(lerp(20, 90, sunOn) + flare * 140, 3 + flare * 3, 1);
        streak.material.opacity = sunOn * (0.35 + flare * 0.65) * (1 - P(t, T.reveal + 0.5, T.dive));
        st.mat.uniforms.uA.value = smooth(P(t, 0.3, 2.2));
        pl.atm.uniforms.uA.value = lerp(0.2, 1, smooth(P(t, 0, 1.8)));
        pl.surf.uniforms.uCity.value = 0.5 + smooth(P(t, 2.0, 4.0));
        // camera
        const kA = smooth(P(t, 0, T.reveal + 0.3));
        const kB = ease.io3(P(t, T.reveal, T.dive));
        const a = lerp(lerp(-0.08, 0.04, kA), 0.95, kB);
        let d = lerp(lerp(1.62, 1.55, kA), 3.7, kB);
        const notice = ease.out5(P(t, T.notice, T.notice + 0.35));
        d -= notice * 0.55;
        const h = lerp(lerp(0.05, 0.22, kA), 0.55, kB);
        let pos = new THREE.Vector3(Math.sin(a) * d, h, Math.cos(a) * d);
        const lookA = new THREE.Vector3(0, lerp(0.95, 1.12, kA), -0.6);
        let look = lookA.clone().lerp(new THREE.Vector3(0, 0, 0), kB);
        look.lerp(sigW.clone().multiplyScalar(0.75), notice);
        let fov = lerp(52, 38, kB);
        if (t >= T.dive) {
          const k = ease.in3(P(t, T.dive, T.city));
          const above = sigW.clone().normalize().multiplyScalar(1.025);
          pos = pos.clone().lerp(above, k);
          look = look.clone().lerp(sigW, smooth(P(t, T.dive, T.dive + 0.35)));
          fov = lerp(38, 80, ease.in3(P(t, T.dive + 0.25, T.city)));
        }
        cam.position.copy(pos);
        cam.fov = fov;
        cam.updateProjectionMatrix();
        cam.lookAt(look);
        cam.rotateZ(lerp(0.18, -0.05, smooth(P(t, 0, T.dive))) + Math.sin(t * 0.7) * 0.01);
        // the notification and its ripples
        const sOn = smooth(P(t, T.signal, T.signal + 0.35));
        const pop = 1 + 0.35 * Math.exp(-(t - T.signal) * 5) * (t > T.signal ? 1 : 0);
        sigSprite.scale.setScalar(0.15 * pop);
        sigSprite.material.opacity = sOn;
        ripples.forEach((rg, i) => {
          const ph = (((t - T.signal) * 0.7 + i / 3) % 1 + 1) % 1;
          const s = 0.03 + ph * 0.3;
          rg.scale.set(s, s, s);
          (rg.material as THREE.MeshBasicMaterial).opacity = t > T.signal ? (1 - ph) * 0.8 : 0;
        });
        net.mats.forEach((m) => (m.uniforms.uA.value = 0));
        net.nodes.forEach((n) => (n.material.opacity = 0));
        fog.style.opacity = (smooth(P(t, T.clouds + 0.1, T.city)) * 0.92).toFixed(3);
        cam.updateMatrixWorld();
        const sp = toScreen(sigW, cam);
        hud.x = sp.x;
        hud.y = sp.y;
        hud.on = sp.z < 1 && t > T.signal ? 1 : 0;
        hud.size = 0;
      } else {
        // ── the return: rise from the surface; the planet wired with light ──
        setSun(0.25, 0.9);
        sunGlow.material.opacity = 0;
        sunCore.material.opacity = 0;
        streak.material.opacity = 0;
        st.mat.uniforms.uA.value = 1;
        pl.atm.uniforms.uA.value = 1.1;
        pl.surf.uniforms.uCity.value = 1.6;
        sigSprite.material.opacity = 1 - P(t, T.pullout, T.pullout + 0.6);
        ripples.forEach((rg) => ((rg.material as THREE.MeshBasicMaterial).opacity = 0));
        const k = ease.out5(P(t, T.pullout, T.pullout + 2.4));
        const k2 = ease.io3(P(t, T.logo - 1.2, T.logo + 1.4));
        const dirS = sigW.clone().normalize();
        const side = new THREE.Vector3(Math.sin(0.95), 0.18, Math.cos(0.95)).normalize();
        const dir = dirS.clone().lerp(side, smooth(P(t, T.pullout, T.pullout + 2.6))).normalize();
        const r = lerp(lerp(1.03, 3.6, k), 7.4, k2);
        cam.position.copy(dir.multiplyScalar(r));
        cam.fov = lerp(80, 40, k);
        cam.updateProjectionMatrix();
        cam.lookAt(new THREE.Vector3(0, lerp(0, 1.95, k2), 0));
        cam.rotateZ(lerp(0.3, 0, ease.out3(P(t, T.pullout, T.pullout + 2.5))));
        net.mats.forEach((m, i) => {
          m.uniforms.uP.value = ease.out3(P(t, T.net + (i % 40) * 0.035, T.net + 1.3 + (i % 40) * 0.035));
          m.uniforms.uA.value = 1;
        });
        net.nodes.forEach((n, i) => (n.material.opacity = smooth(P(t, T.net + 0.3 + i * 0.02, T.net + 0.8 + i * 0.02)) * (0.7 + 0.3 * Math.sin(t * 3 + i))));
        fog.style.opacity = (1 - smooth(P(t, T.pullout, T.pullout + 0.45))).toFixed(3);
        hud.on = 0;
      }
      renderer.render(space, cam);
      return;
    }
    // ── the city: a spiral descent down the column of light ──────────────
    if (t < T.env + 0.05) {
      const k = P(t, T.city, T.env);
      const BZ = ct.BZ;
      const th = lerp(0.2, 3.1, ease.io3(k) * 0.7 + k * 0.3);
      const h = lerp(3200, 175, ease.in3(k) * 0.55 + ease.out3(k) * 0.45);
      const r = lerp(900, 0, ease.out3(k));
      ct.cam.position.set(Math.cos(th) * r, h, BZ + Math.sin(th) * r);
      ct.cam.up.set(Math.cos(th + 1.2), 0, Math.sin(th + 1.2));
      ct.cam.fov = lerp(62, 74, k);
      ct.cam.updateProjectionMatrix();
      ct.cam.lookAt(0, 160, BZ);
      ct.rings.forEach((rg, i) => {
        const ph = ((t * 0.9 + i / 4) % 1 + 1) % 1;
        rg.position.set(0, 160 + ph * 2600, BZ);
        rg.scale.setScalar(60 + ph * 40);
        (rg.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.8;
      });
      ct.halo.material.opacity = 1 - 0.7 * smooth(P(t, T.city + 0.5, T.env));
      fog.style.opacity = Math.max(0, 0.92 - smooth(P(t, T.city, T.city + 0.4)) * 0.92).toFixed(3);
      ct.cam.updateMatrixWorld();
      const bp = toScreen(new THREE.Vector3(0, 160, BZ), ct.cam);
      hud.x = bp.x;
      hud.y = bp.y;
      hud.on = bp.z < 1 ? 1 : 0;
      // on-screen size of the icon (sprite, 150 units)
      const dist = ct.cam.position.distanceTo(new THREE.Vector3(0, 160, BZ));
      hud.size = (150 / (2 * dist * Math.tan((ct.cam.fov * Math.PI) / 360))) * H * 0.42;
      renderer.render(ct.scene, ct.cam);
      return;
    }
    fog.style.opacity = "0";
    hud.on = 0;
    // ── the flood → the tower ────────────────────────────────────────────
    if (t >= T.flood - 0.3 && t < T.clean) {
      const s = hl;
      s.st.mat.uniforms.uT.value = t;
      (s.cyl.material as THREE.ShaderMaterial).uniforms.uT.value = t;
      // camera
      const cp = new THREE.Vector3();
      const look = new THREE.Vector3();
      if (t < T.tower) {
        const sat = smooth(P(t, T.saturate - 0.5, T.tower));
        const a = Math.sin(t * 0.35) * 0.12;
        cp.set(Math.sin(a) * 2300, Math.sin(t * 0.4) * 60, Math.cos(a) * 2300);
        look.set(0, 0, 0);
        const shake = sat * 10;
        cp.x += Math.sin(t * 43) * shake;
        cp.y += Math.sin(t * 37 + 1) * shake;
        s.cam.fov = lerp(55, 60, sat);
        s.cam.position.copy(cp);
        s.cam.lookAt(look);
        s.cam.rotateZ(Math.sin(t * 0.5) * 0.04 + sat * Math.sin(t * 29) * 0.012);
      } else {
        // crane: down to the base, then up the tower, then into the core
        const k0 = ease.io3(P(t, T.tower, T.levels));
        const k1 = ease.io3(P(t, T.levels, T.converge));
        const k2 = ease.in3(P(t, T.converge, T.clean));
        const a = lerp(lerp(0, 0.5, k0), 2.2, k1);
        const r = lerp(lerp(2300, 1500, k0), 1250, k1);
        const y = lerp(lerp(0, -1000, k0), 1050, k1);
        cp.set(Math.sin(a) * r, y, Math.cos(a) * r);
        look.set(0, lerp(lerp(0, -600, k0), 700, k1), 0);
        cp.lerp(new THREE.Vector3(0, LY[4] + 120, 60), k2);
        look.lerp(new THREE.Vector3(0, LY[4] + 40, 0), k2);
        s.cam.fov = lerp(55, 85, k2);
        s.cam.position.copy(cp);
        s.cam.lookAt(look);
        s.cam.rotateZ(lerp(0.06, -0.04, k1) + k2 * 0.6);
      }
      s.cam.updateProjectionMatrix();
      s.cam.updateMatrixWorld();
      // tower build-up
      const rise = ease.out3(P(t, T.tower, T.tower + 0.9));
      s.cyl.scale.set(1, Math.max(0.001, rise), 1);
      (s.cyl.material as THREE.ShaderMaterial).uniforms.uA.value = rise * (1 - P(t, T.converge + 0.2, T.clean));
      (s.spine.material as THREE.MeshBasicMaterial).opacity = rise * 0.8;
      s.ringMats.forEach((m, k) => {
        const on = T.levels + k * 0.8;
        const built = smooth(P(t, T.tower + 0.1 + k * 0.12, T.tower + 0.5 + k * 0.12));
        const lit = t >= on ? 1 + 1.5 * Math.exp(-(t - on) * 3) : 0.35;
        m.opacity = built * lit * 0.6 * (1 - P(t, T.converge + 0.3, T.clean));
        s.tickMats[k].opacity = built * (t >= on ? 0.7 : 0.15) * (1 - P(t, T.converge + 0.3, T.clean));
        (m.userData.disc as THREE.ShaderMaterial).uniforms.uA.value = built * (t >= on ? 1 + 2 * Math.exp(-(t - on) * 3) : 0.3);
      });
      const ign = smooth(P(t, T.converge - 0.4, T.converge + 0.3));
      s.core.material.opacity = Math.max(rise * 0.25, ign);
      s.core.scale.setScalar(400 + ign * 1600 + Math.sin(t * 7) * 30);
      // cards
      for (let i = 0; i < s.N; i++) {
        const c = s.card[i];
        const ka = ease.out3(P(t, c.arrive, c.arrive + 1.1));
        const pos = new THREE.Vector3();
        let fl = 0;
        let lv = 0;
        let scl = ka > 0 ? 1 : 0;
        // flood orbit
        const rr = lerp(7000, c.r1, ka);
        const ang = c.ph + (t - T.flood) * c.sp * (0.6 + smooth(P(t, T.saturate - 1, T.tower)) * 1.2);
        pos.copy(c.d).multiplyScalar(rr).applyAxisAngle(Y, ang);
        pos.y += Math.sin(t * 1.1 + c.ph) * 30;
        e3.set(c.tilt * Math.sin(t + c.ph), ang * 0.3, c.tilt * 0.5);
        q.setFromEuler(e3);
        if (t >= T.tower) {
          // drawn to the base of the tower, then up the spiral, level by level
          const u = clamp((t - c.enter) / 1.35);
          const yy = lerp(LY[0] - 200, LY[4], u);
          const th = c.phi + u * Math.PI * 4 + t * 0.4;
          const rad = TR - 90 - u * 60;
          const sp = new THREE.Vector3(Math.cos(th) * rad, yy, Math.sin(th) * rad);
          const pull = ease.io3(P(t, T.tower, c.enter));
          pos.lerp(sp, t >= c.enter ? 1 : pull);
          const qq = new THREE.Quaternion().setFromAxisAngle(Y, -th + Math.PI / 2);
          q.slerp(qq, t >= c.enter ? 1 : pull);
          scl = 0.58 + 0.42 * (1 - pull);
          if (t >= c.enter) {
            lv = u;
            const lvl = u * 4;
            const frac = lvl - Math.floor(lvl);
            fl = u > 0 && u < 1 ? Math.exp(-frac * 6) : 0;
          }
          if (u >= 1 || t >= T.converge) {
            const kc = ease.in3(P(t, Math.max(c.enter + 1.35, T.converge - 0.1), Math.max(c.enter + 1.65, T.converge + 0.35)));
            pos.lerp(new THREE.Vector3(0, LY[4] + 40, 0), kc);
            scl *= 1 - kc;
            lv = 1;
          }
        }
        m4.compose(pos, q, sc.copy(one).multiplyScalar(Math.max(0.0001, scl)));
        s.mesh.setMatrixAt(i, m4);
        s.aFl[i] = fl;
        s.aLv[i] = lv;
      }
      s.mesh.instanceMatrix.needsUpdate = true;
      s.flA.needsUpdate = true;
      s.lvA.needsUpdate = true;
      // level labels, on the side of the tower facing the camera's right
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(s.cam.quaternion).setY(0).normalize();
      hud.levels = LY.map((y) => toScreen(right.clone().multiplyScalar(TR + 60).setY(y), s.cam));
      renderer.render(s.scene, s.cam);
      return;
    }
    // ── the backdrop behind the interface ────────────────────────────────
    bst.mat.uniforms.uT.value = t;
    bcam.position.set(Math.sin(t * 0.15) * 60, Math.cos(t * 0.11) * 40, 400 - (t % 30) * 5);
    bcam.lookAt(0, 0, -500);
    backGlows.forEach((g, i) => (g.material.rotation = t * 0.05 * (i % 2 ? 1 : -1)));
    renderer.render(back, bcam);
  });
}
