import {fileURLToPath, URL} from "node:url";
import react from "@vitejs/plugin-react";
import {defineConfig} from "vite";

export default defineConfig({
  plugins: [react()],
  // The deployment already provides NEXT_PUBLIC_* variables; VITE_* also works.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  resolve: {alias: {"@": fileURLToPath(new URL("./src", import.meta.url))}},
  server: {port: 3000, strictPort: true},
});
