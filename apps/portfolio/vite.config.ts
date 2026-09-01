import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from a project subpath on GitHub Pages: …github.io/git/portfolio/
export default defineConfig({
  base: "/git/portfolio/",
  plugins: [react()],
  build: { target: "es2020", assetsInlineLimit: 0, chunkSizeWarningLimit: 900 }
});
