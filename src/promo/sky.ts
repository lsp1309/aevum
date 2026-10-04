import { onFrame } from "../core/clock";
import { $, sizeCanvas, W, H } from "./stage";

/**
 * The light field behind everything: a WebGL fragment shader at half
 * resolution (it is all soft light), driven by a tweenable state.
 *   – a vertical base gradient (top / bottom)
 *   – two volumetric lights, modulated by slow smoke (fbm)
 *   – an ember horizon, a vertical beam (the pillar act)
 *   – `flood`: the whole frame opens into warm daylight (the end card)
 * Colours are "r,g,b" strings (0–255) so GSAP can tween them.
 */
export const sky = {
  top: "8,7,10",
  bot: "5,4,7",
  l1x: 0.5,
  l1y: 0.42,
  l1r: 0.5,
  l1i: 0.0,
  c1: "120,110,130",
  l2x: 0.5,
  l2y: 0.9,
  l2r: 0.4,
  l2i: 0.0,
  c2: "255,120,60",
  fog: 0.6,
  beam: 0,
  horizon: 0,
  hz: "255,110,50",
  flood: 0,
  drift: 0,
};

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uTop, uBot, uC1, uC2, uHz;
uniform vec4 uL1, uL2;
uniform float uFog, uBeam, uHorizon, uFlood, uDrift;

float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.07 + vec3(3.1, 1.7, 8.3); a *= 0.5; } return v / 0.9375; }
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 light(vec2 s, vec4 L, vec3 c, float smoke){
  vec2 d = (s - L.xy * vec2(${W}.0, ${H}.0)) / (L.z * ${H}.0);
  float r2 = dot(d, d);
  float g = exp(-r2 * 2.2) * 0.85 + exp(-sqrt(r2) * 3.0) * 0.35;
  return c * g * L.w * (0.7 + 0.6 * smoke);
}

void main(){
  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);
  vec2 s = uv * vec2(${W}.0, ${H}.0);
  float t = uTime;
  vec3 q = vec3(s / 520.0 + vec2(0.0, -uDrift), t * 0.06);
  float smoke = fbm(q + vec3(fbm(q * 0.7 + 3.0) * 1.6, 0.0, 0.0));
  float sm = mix(0.5, smoke, uFog);

  vec3 col = mix(uTop, uBot, smoothstep(0.0, 1.0, uv.y));
  col *= 0.85 + 0.3 * sm;
  col += light(s, uL1, uC1, sm);
  col += light(s, uL2, uC2, sm);
  // ember horizon, low in the frame
  float hy = 1.0 - uv.y;
  col += uHz * uHorizon * (exp(-hy * hy * 22.0) * 0.9 + exp(-hy * 4.0) * 0.18) * (0.75 + 0.5 * sm);
  // the beam: a vertical shaft of white-gold light through the centre
  float bx = abs(s.x - ${W / 2}.0);
  col += vec3(1.0, 0.86, 0.66) * uBeam * (exp(-bx / 26.0) * 0.9 + exp(-bx / 160.0) * 0.35 + exp(-bx / 520.0) * 0.12) * (0.8 + 0.4 * sm);

  // filmic shoulder (keeps highlights rich, never clipped flat)
  col = 1.0 - exp(-col * 1.15);

  // daylight: cream at the top, apricot at the bottom, a breath of smoke
  vec3 day = mix(vec3(0.985, 0.962, 0.930), vec3(1.0, 0.835, 0.690), smoothstep(0.25, 1.05, uv.y));
  day += vec3(1.0, 0.62, 0.48) * 0.10 * exp(-pow((uv.x - 0.5) * 1.6, 2.0) - pow((uv.y - 1.05) * 2.2, 2.0));
  day -= vec3(0.03, 0.035, 0.03) * (smoke - 0.5);
  col = mix(col, day, uFlood);

  col += (h21(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) / 160.0; // dither
  gl_FragColor = vec4(col, 1.0);
}`;

const rgb = (s: string) => s.split(",").map((v) => Number(v) / 255) as [number, number, number];

export function initSky() {
  const canvas = $<HTMLCanvasElement>("#sky");
  sizeCanvas(canvas, 0.5);
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true })!;
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
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const U = {
    res: u("uRes"),
    time: u("uTime"),
    top: u("uTop"),
    bot: u("uBot"),
    c1: u("uC1"),
    c2: u("uC2"),
    hz: u("uHz"),
    l1: u("uL1"),
    l2: u("uL2"),
    fog: u("uFog"),
    beam: u("uBeam"),
    horizon: u("uHorizon"),
    flood: u("uFlood"),
    drift: u("uDrift"),
  };
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform2f(U.res, canvas.width, canvas.height);

  onFrame((t) => {
    const k = sky;
    gl.uniform1f(U.time, t);
    gl.uniform3f(U.top, ...rgb(k.top));
    gl.uniform3f(U.bot, ...rgb(k.bot));
    gl.uniform3f(U.c1, ...rgb(k.c1));
    gl.uniform3f(U.c2, ...rgb(k.c2));
    gl.uniform3f(U.hz, ...rgb(k.hz));
    gl.uniform4f(U.l1, k.l1x, k.l1y, k.l1r, k.l1i);
    gl.uniform4f(U.l2, k.l2x, k.l2y, k.l2r, k.l2i);
    gl.uniform1f(U.fog, k.fog);
    gl.uniform1f(U.beam, k.beam);
    gl.uniform1f(U.horizon, k.horizon);
    gl.uniform1f(U.flood, k.flood);
    gl.uniform1f(U.drift, k.drift);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
}
