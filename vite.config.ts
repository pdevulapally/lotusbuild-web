import {readFileSync} from "node:fs";
import {fileURLToPath, URL} from "node:url";
import react from "@vitejs/plugin-react";
import {defineConfig, loadEnv} from "vite";

// `vite preview` serves the same security headers as production (vercel.json),
// minus the HTTPS-only ones that would break a plain-http local preview.
const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")) as {
  headers: {source: string; headers: {key: string; value: string}[]}[];
};
const previewHeaders = Object.fromEntries(
  vercel.headers[0].headers
    .filter(header => header.key !== "Strict-Transport-Security")
    .map(header => [header.key, header.value.replace(/;\s*upgrade-insecure-requests/, "")]),
);

const envPrefix = ["VITE_", "NEXT_PUBLIC_"];

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), envPrefix);
  const apiTarget = env.VITE_API_BASE_URL || env.NEXT_PUBLIC_API_BASE_URL;
  return {
    plugins: [react()],
    envPrefix,
    resolve: {alias: {"@": fileURLToPath(new URL("./src", import.meta.url))}},
    server: {
      port: 3000,
      strictPort: true,
      // Dev only: forward /api to the API server-side, so the browser makes
      // same-origin calls and the production CORS allowlist stays untouched.
      proxy: apiTarget ? {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: path => path.replace(/^\/api/, ""),
          configure: proxy => { proxy.on("proxyReq", request => request.removeHeader("origin")); },
        },
      } : undefined,
    },
    preview: {port: 3000, strictPort: true, headers: previewHeaders},
    build: {sourcemap: false, target: "es2022"},
    optimizeDeps: {esbuildOptions: {target: "es2022"}},
  };
});
