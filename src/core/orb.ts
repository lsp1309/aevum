/**
 * The ASTRYA core: a volumetric sphere rendered in a fragment shader.
 * Ray-marched FBM nebula inside a glass shell, fresnel rim, bloom halo.
 * Pure function of (time, uniforms) → deterministic, seekable.
 */
const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uEnergy;   // 0..1 brightness of the nebula
uniform float uFlare;    // 0.. push-in white-out
uniform float uReveal;   // 0..1 sphere materialising

float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                 mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                 mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++){ v += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
  return v;
}
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main(){
  vec2 uv = vUv * 2.0 - 1.0;           // canvas spans [-1,1]
  float R = 0.5;                        // sphere radius in canvas units (leaves room for halo)
  float d = length(uv);
  vec3 col = vec3(0.0);
  float alpha = 0.0;

  // outer halo (bloom) – always present, scaled by reveal
  float halo = exp(-max(d - R, 0.0) * 7.0) * 0.55 + exp(-max(d - R, 0.0) * 2.4) * 0.18;
  vec3 haloCol = mix(vec3(0.18, 0.32, 1.0), vec3(0.55, 0.75, 1.0), exp(-max(d - R, 0.0) * 9.0));

  if (d < R) {
    float z = sqrt(R * R - d * d);
    vec3 n = normalize(vec3(uv, z));
    // march from the front surface through the volume
    vec3 ro = vec3(uv, z);
    vec3 acc = vec3(0.0);
    float t = uTime * 0.18;
    for (int i = 0; i < 18; i++) {
      float fi = float(i) / 18.0;
      vec3 p = vec3(uv, mix(z, -z, fi));
      vec3 q = p * 2.6;
      q.xz *= rot(t * 1.3);
      q.xy *= rot(t * 0.7);
      float warp = fbm(q + vec3(t * 2.0, -t, t * 0.5));
      float dens = fbm(q * 1.4 + warp * 1.8 - vec3(0.0, t * 1.5, 0.0));
      dens = smoothstep(0.42, 0.8, dens);
      float r = length(p) / R;
      float core = exp(-r * r * 11.0);
      vec3 c1 = vec3(0.16, 0.30, 1.0);      // deep blue
      vec3 c2 = vec3(0.58, 0.40, 1.0);      // violet
      vec3 c3 = vec3(0.78, 0.90, 1.0);      // ice white
      vec3 c = mix(c1, c2, smoothstep(0.3, 0.9, warp));
      c = mix(c, c3, core * 0.9);
      acc += c * (dens * 0.16 + core * 0.135);
    }
    acc *= uEnergy;
    float fres = pow(1.0 - n.z, 2.6);
    vec3 rim = vec3(0.45, 0.68, 1.0) * fres * 1.3;
    vec3 base = vec3(0.04, 0.10, 0.42) * (0.7 + 0.3 * n.y);
    // soft specular highlight top-left
    float spec = pow(max(dot(n, normalize(vec3(-0.5, 0.6, 0.65))), 0.0), 40.0) * 0.6;
    col = base + acc + rim + spec;
    float edge = smoothstep(R, R - 0.006, d);
    alpha = edge;
    col = mix(haloCol * halo, col, edge);
    alpha = max(alpha, halo);
  } else {
    col = haloCol * halo;
    alpha = halo;
  }

  // push-in flare: everything floods to light
  col += vec3(0.75, 0.86, 1.0) * uFlare * exp(-d * d * 2.5) * 1.6;
  alpha = max(alpha, uFlare * exp(-d * d * 2.5));

  col *= uReveal;
  alpha *= uReveal;
  col = 1.0 - exp(-col * 1.6);          // filmic tonemap
  gl_FragColor = vec4(col * alpha, alpha); // premultiplied
}
`;

export interface Orb {
  canvas: HTMLCanvasElement;
  state: { energy: number; flare: number; reveal: number };
  render(t: number): void;
}

export function createOrb(size = 900, res = 640): Orb {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.className = "orb-canvas";
  const state = { energy: 1, flare: 0, reveal: 0 };
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) {
    canvas.classList.add("orb-fallback");
    return { canvas, state, render() {} };
  }
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
  const u = {
    time: gl.getUniformLocation(prog, "uTime"),
    energy: gl.getUniformLocation(prog, "uEnergy"),
    flare: gl.getUniformLocation(prog, "uFlare"),
    reveal: gl.getUniformLocation(prog, "uReveal"),
  };
  gl.viewport(0, 0, res, res);
  gl.clearColor(0, 0, 0, 0);
  let last = "";
  return {
    canvas,
    state,
    render(t: number) {
      const key = `${t.toFixed(4)}|${state.energy}|${state.flare}|${state.reveal}`;
      if (key === last) return;
      last = key;
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (t < 0 || state.reveal <= 0.001) return;
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.energy, state.energy);
      gl.uniform1f(u.flare, state.flare);
      gl.uniform1f(u.reveal, state.reveal);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
