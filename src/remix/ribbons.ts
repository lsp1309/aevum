import { onFrame } from "../core/clock";
import { $, W, H } from "./stage";

/**
 * Silky ribbons of light on black (the opening backdrop), in Astrya blues:
 * a few sheets of light folding over each other, white-hot where they turn,
 * electric blue in their body, deep indigo at their edges. Half resolution,
 * driven by a tweenable state.
 */
export const rib = { a: 1, x: 0, y: 0, zoom: 1, flow: 0, hue: 0, warm: 0 };

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uT, uA, uFlow, uZoom, uHue;
uniform vec2 uOff;

float band(vec2 p, float k, float ph, float w){
  // a ribbon: a slow curve, soft falloff around it — a sheet of light seen edge-on
  float y = 0.45 * sin(p.x * 0.9 * k + ph) + 0.16 * sin(p.x * 1.9 * k - ph * 1.3);
  float d = (p.y - y) / w;
  return exp(-d * d);
}
vec3 pal(float t){
  // indigo → electric blue → cyan-white, with an optional neon shift
  vec3 a = vec3(0.04, 0.06, 0.32);
  vec3 b = vec3(0.12, 0.33, 1.0);
  vec3 c = vec3(0.62, 0.88, 1.0);
  vec3 col = t < 0.5 ? mix(a, b, t * 2.0) : mix(b, c, t * 2.0 - 1.0);
  vec3 neon = t < 0.5 ? mix(vec3(0.25, 0.05, 0.45), vec3(0.55, 0.25, 1.0), t * 2.0) : mix(vec3(0.55, 0.25, 1.0), vec3(0.2, 0.95, 1.0), t * 2.0 - 1.0);
  return mix(col, neon, uHue);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0) * 2.0 / uZoom + uOff;
  float t = uT * 0.35 + uFlow;
  // rotate the field a little: diagonal sheets, like flames of light
  float c = cos(0.62), s = sin(0.62);
  p = mat2(c, -s, s, c) * p;
  // silk: warp the field so the sheets fold and curl like flames
  vec2 q = p;
  q += 0.28 * vec2(sin(p.y * 1.6 + t * 1.1), cos(p.x * 1.2 - t * 0.9));
  q += 0.12 * vec2(sin(q.y * 3.1 - t * 1.7), sin(q.x * 2.7 + t * 1.3));
  float l = 0.0;
  l += band(q + vec2(0.0, 0.05), 1.0, t, 0.20) * 1.15;
  l += band(q + vec2(0.4, -0.35), 0.85, t * 1.2 + 2.0, 0.12) * 0.75;
  l += band(q + vec2(-0.3, 0.45), 1.15, t * 0.8 + 4.0, 0.34) * 0.5;
  l += band(q * 0.8 + vec2(0.1, -0.6), 0.7, t * 1.05 + 1.0, 0.45) * 0.3;
  // a hot core where the sheets cross
  float core = pow(clamp(l - 0.9, 0.0, 2.0), 1.5);
  vec3 col = pal(clamp(l * 0.55, 0.0, 1.0)) * l * 0.9 + vec3(0.85, 0.95, 1.0) * core * 0.6;
  col = 1.0 - exp(-col * 1.3);
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uT) * 43758.5453);
  col += (n - 0.5) / 180.0;
  gl_FragColor = vec4(col * uA, 1.0);
}`;

export function initRibbons() {
  const cv = $<HTMLCanvasElement>("#ribbons");
  cv.width = W / 2;
  cv.height = H / 2;
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  const gl = cv.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true })!;
  const sh = (type: number, src: string) => {
    const x = gl.createShader(type)!;
    gl.shaderSource(x, src);
    gl.compileShader(x);
    if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(x));
    return x;
  };
  const pr = gl.createProgram()!;
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr);
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n: string) => gl.getUniformLocation(pr, n);
  gl.viewport(0, 0, cv.width, cv.height);
  gl.uniform2f(u("uRes"), cv.width, cv.height);
  onFrame((t) => {
    gl.uniform1f(u("uT"), t);
    gl.uniform1f(u("uA"), rib.a);
    gl.uniform1f(u("uFlow"), rib.flow);
    gl.uniform1f(u("uZoom"), rib.zoom);
    gl.uniform1f(u("uHue"), rib.hue);
    gl.uniform2f(u("uOff"), rib.x, rib.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
}
