import {readFileSync} from "node:fs";
import {fileURLToPath, URL} from "node:url";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

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

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {alias: {"@": fileURLToPath(new URL("./src", import.meta.url))}},
  server: {port: 3000, strictPort: true},
  preview: {port: 3000, strictPort: true, headers: previewHeaders},
  build: {sourcemap: false},
});
