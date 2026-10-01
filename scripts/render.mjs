#!/usr/bin/env node
/**
 * Frame-exact renderer. The film is a single GSAP master timeline whose every
 * layer (DOM, canvas particles, WebGL core) is a pure function of time, so we
 * can seek to t = frame / fps, capture, and pipe frames into ffmpeg.
 *
 *   npm run render                        → out/astrya.mp4 (1920×1080, 30 fps)
 *   npm run render -- --fps 60 --crf 14
 *   npm run render -- --from 20 --to 30 --out out/clip.mp4
 *   npm run render -- --shots 3,12.5,40 --dir out/shots   (stills only)
 *   npm run render -- --cues scripts/cues.json             (sound cue sheet for scripts/score.py)
 */
import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer, build, preview } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split("--")
    .filter(Boolean)
    .map((a) => {
      const [k, ...v] = a.trim().split(/\s+/);
      return [k, v.join(" ") || true];
    }),
);

const fps = Number(args.fps ?? 30);
const crf = String(args.crf ?? 16);
const width = Number(args.width ?? 1920);
const height = Math.round((width * 9) / 16);
const useDev = Boolean(args.dev);

async function startServer() {
  if (useDev) {
    const server = await createServer({ root, logLevel: "error", server: { port: 5199 } });
    await server.listen();
    return { url: "http://localhost:5199", close: () => server.close() };
  }
  if (!args["no-build"]) await build({ root, logLevel: "warn" });
  const server = await preview({ root, logLevel: "error", preview: { port: 4199 } });
  return { url: "http://localhost:4199", close: () => new Promise((r) => server.httpServer.close(r)) };
}

const server = await startServer();
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--force-color-profile=srgb", "--hide-scrollbars"],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && console.log(`[page:${m.type()}]`, m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.goto(`${server.url}/?render=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__film && window.__film.duration > 0, null, { timeout: 60000 });
const duration = await page.evaluate(() => window.__film.duration);

const seek = (t) =>
  page.evaluate(
    (t) =>
      new Promise((res) => {
        window.__film.seek(t);
        requestAnimationFrame(() => requestAnimationFrame(res));
      }),
    t,
  );

if (args.cues) {
  const { writeFileSync } = await import("node:fs");
  const cues = await page.evaluate(() => ({ duration: window.__film.duration, chapters: window.__film.chapters, cues: window.__film.cues }));
  const file = resolve(root, String(args.cues));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(cues, null, 1));
  console.log(`wrote ${cues.cues.length} cues → ${file}`);
} else if (args.shots) {
  const dir = resolve(root, args.dir ?? "out/shots");
  mkdirSync(dir, { recursive: true });
  const times = String(args.shots).split(",").map(Number);
  for (const t of times) {
    await seek(t);
    const file = `${dir}/t${t.toFixed(2).padStart(6, "0")}.jpg`;
    await page.screenshot({ path: file, type: "jpeg", quality: 90 });
    console.log("shot", file);
  }
} else {
  const from = Number(args.from ?? 0);
  const to = Math.min(Number(args.to ?? duration), duration);
  const out = resolve(root, args.out ?? "out/astrya.mp4");
  mkdirSync(dirname(out), { recursive: true });
  const total = Math.round((to - from) * fps);
  const ff = spawn(
    "ffmpeg",
    [
      "-y",
      "-loglevel", "error",
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-c:v", "mjpeg",
      "-i", "-",
      ...(args.audio && existsSync(resolve(root, args.audio)) ? ["-i", resolve(root, args.audio), "-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", crf,
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      out,
    ],
    { stdio: ["pipe", "inherit", "inherit"] },
  );
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await seek(from + f / fps);
    const buf = await page.screenshot({ type: "jpeg", quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % fps === 0) {
      const el = (Date.now() - t0) / 1000;
      const eta = (el / (f + 1)) * (total - f - 1);
      process.stdout.write(`\rframe ${f}/${total}  ${(from + f / fps).toFixed(1)}s  eta ${Math.round(eta)}s   `);
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  console.log(`\nwrote ${out}`);
}

await browser.close();
await server.close();
process.exit(0);
