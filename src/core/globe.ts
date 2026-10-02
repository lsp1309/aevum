import { W, H, onResize } from "./stage";

/**
 * The ASTRYA core: a glass sphere full of light, rendered in a fragment shader
 * on a canvas that covers the whole frame — so it stays sharp at any camera
 * distance. Ray-marched nebula (blue → violet → magenta wisps) around a white
 * hot core, a cyan fresnel rim, a specular glint and a layered bloom halo.
 * Pure function of (time, uniforms) → deterministic and seekable.
 */
const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;      // canvas size (px)
uniform float uK;       // canvas px per stage px
uniform vec2 uC;        // sphere centre (stage px, y down)
uniform float uR;       // sphere radius (stage px)
uniform float uTime;
uniform float uSpin;    // extra rotation of the nebula
uniform float uEnergy;  // inner light
uniform float uFlash;   // white-out pulse
uniform float uReveal;  // 0..1 materialising

float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
  return v / 0.9375;
}
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main(){
  vec2 s = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uK;
  vec2 p = (s - uC) / uR;
  p.y = -p.y;
  float d = length(p);
  float aa = 1.4 / uR;
  float h = max(d - 1.0, 0.0);

  // bloom halo: a thin cyan rim glow, then a deep-blue atmosphere
  float halo = 0.22 * exp(-h * 16.0) + 0.09 * exp(-h * 3.4) + 0.035 * exp(-h * 1.0);
  vec3 hcol = mix(vec3(0.05, 0.16, 0.90), vec3(0.24, 0.60, 1.0), exp(-h * 14.0)) * halo;
  hcol += vec3(0.65, 0.82, 1.0) * uFlash * exp(-h * 2.2) * 0.75;

  vec3 col = hcol;
  float alpha = 0.0;
  if (d < 1.0 + aa) {
    float dd = min(d, 0.9995);
    float z = sqrt(1.0 - dd * dd);
    vec3 n = vec3(p, z);
    float t = uTime;
    // nebula: three parallax layers (front shell → centre), domain-warped and
    // swirled around the axis — crisp detail with real depth
    vec3 neb = vec3(0.0);
    float lanes = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float zi = z * (1.0 - 0.45 * fi);
      vec3 q = vec3(p * (1.0 + 0.12 * fi), zi);
      float r = length(q);
      q.xz *= rot(uSpin + t * (0.10 + 0.03 * fi));
      q.xy *= rot(1.3 * (1.0 - r) + 0.4 * fi + t * 0.05);
      vec3 w = vec3(fbm(q * 2.3 + vec3(0.0, t * 0.08, fi * 3.1)), fbm(q * 2.3 + vec3(5.2, 1.3 - t * 0.06, 2.0)), 0.0);
      float dens = fbm(q * 3.4 + w.xyx * 2.2 + vec3(fi * 7.0, 0.0, t * 0.05));
      float wisp = smoothstep(0.56, 0.80, dens);
      float hot = smoothstep(0.60, 0.80, w.x) * exp(-r * r * 2.0);
      vec3 c = mix(vec3(0.52, 0.26, 1.0), vec3(1.0, 0.34, 0.92), smoothstep(0.45, 0.75, w.y));
      neb += c * wisp * (0.62 - 0.14 * fi) + vec3(0.75, 0.90, 1.0) * hot * 1.7;
      lanes += (1.0 - smoothstep(0.30, 0.55, dens)) * (0.34 - 0.08 * fi);
    }
    // hot core — irregular, stirred by the nebula
    float w0 = fbm(vec3(p * 3.0, t * 0.22));
    float core = exp(-d * d * 6.0) * (0.5 + 0.8 * w0);
    float hotc = exp(-d * d * 15.0) * (0.75 + 1.0 * w0);
    vec3 light = vec3(0.50, 0.72, 1.0) * core * 0.85 + vec3(1.0) * hotc * 2.0;

    // glass body: electric blue, brighter towards the rim, darker lanes inside
    float fres = pow(1.0 - z, 1.0);
    vec3 body = mix(vec3(0.03, 0.13, 0.62), vec3(0.24, 0.62, 1.25), fres);
    body *= 1.0 - 0.45 * clamp(lanes, 0.0, 1.0) * (0.4 + 0.6 * z);
    vec3 rim = vec3(0.30, 0.68, 1.0) * pow(1.0 - z, 4.0) * 0.9 + vec3(0.55, 0.88, 1.0) * pow(1.0 - z, 14.0) * 1.6;
    vec2 g = p - vec2(-0.40, 0.40);
    float spec = exp(-dot(g, g) * 42.0) * 1.15 + pow(max(dot(n, normalize(vec3(-0.5, 0.55, 0.68))), 0.0), 40.0) * 0.25;
    vec2 g2 = p - vec2(0.42, -0.50);
    spec += exp(-dot(g2, g2) * 50.0) * 0.12;
    vec3 c = body + (neb * 0.8 + light) * uEnergy + rim + vec3(0.88, 0.95, 1.0) * spec;
    c += vec3(0.80, 0.90, 1.0) * uFlash * (0.5 + 1.4 * exp(-d * d * 4.0));
    float edge = smoothstep(1.0 + aa, 1.0 - aa, d);
    col = mix(hcol, c, edge);
    alpha = edge;
  }
  // hue-preserving filmic shoulder; only the hottest light burns to white
  float m = max(col.r, max(col.g, col.b));
  if (m > 1e-4) col *= (1.0 - exp(-m * 1.8)) / m;
  col = mix(col, vec3(1.0), smoothstep(1.1, 2.8, m) * 0.7);
  col *= uReveal;
  alpha = max(alpha * uReveal, max(col.r, max(col.g, col.b)));
  gl_FragColor = vec4(col, alpha); // premultiplied
}
`;

export interface Globe {
  canvas: HTMLCanvasElement;
  /** centre/radius in stage px; the rest are shader inputs */
  state: { x: number; y: number; r: number; reveal: number; energy: number; flash: number; spin: number };
  render(t: number): void;
}

export function createGlobe(): Globe {
  const canvas = document.createElement("canvas");
  canvas.className = "globe-canvas";
  const state = { x: W / 2, y: H / 2, r: 200, reveal: 0, energy: 1, flash: 0, spin: 0 };
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return { canvas, state, render() {} };
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = { res: u("uRes"), k: u("uK"), c: u("uC"), r: u("uR"), time: u("uTime"), spin: u("uSpin"), energy: u("uEnergy"), flash: u("uFlash"), reveal: u("uReveal") };
  gl.clearColor(0, 0, 0, 0);
  let k = 1;
  let last = "";
  const live = !document.documentElement.classList.contains("render");
  onResize((s) => {
    // the frame is the limit in a render; live, cap the cost of large windows
    k = live ? Math.min(1, Math.max(0.5, s * (window.devicePixelRatio || 1))) : 1;
    canvas.width = Math.round(W * k);
    canvas.height = Math.round(H * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
    last = "";
  });
  return {
    canvas,
    state,
    render(t: number) {
      const st = state;
      const key = t < 0 ? "off" : [t, st.x, st.y, st.r, st.reveal, st.energy, st.flash, st.spin].map((v) => v.toFixed(3)).join("|");
      if (key === last) return;
      last = key;
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (t < 0 || state.reveal <= 0.001) return;
      gl.uniform2f(U.res, canvas.width, canvas.height);
      gl.uniform1f(U.k, k);
      gl.uniform2f(U.c, state.x, state.y);
      gl.uniform1f(U.r, state.r);
      gl.uniform1f(U.time, t);
      gl.uniform1f(U.spin, state.spin);
      gl.uniform1f(U.energy, state.energy);
      gl.uniform1f(U.flash, state.flash);
      gl.uniform1f(U.reveal, state.reveal);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
