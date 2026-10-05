import { defineConfig } from "vite";
import { resolve } from "node:path";

const root = import.meta.dirname;

export default defineConfig({
  server: { host: true, port: 5173 },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: { main: resolve(root, "index.html"), promo: resolve(root, "promo.html"), mosaic: resolve(root, "mosaic.html"), remix: resolve(root, "remix.html") } },
  },
});
