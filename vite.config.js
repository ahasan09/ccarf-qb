/* Vite builds the React UI (src/) into dist/. The question bank, scenarios,
 * imported exams, config, resources, the pure logic (js/logic.js,
 * js/store.js) and the sync adapter stay classic scripts loaded by
 * index.html, so the validators and logic tests read them where they always
 * were; the build copies them into dist/ unchanged. The icon, manifest and
 * service worker live in public/. */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync } from "node:fs";

const STATIC_FILES = [
  "questions", "scenarios", "exams",
  "js/logic.js", "js/store.js",
  "config.js", "resources.js", "sync.js",
];

export default defineConfig({
  base: "./",
  publicDir: "public", // icon, manifest and service worker, served at the root
  plugins: [
    react(),
    {
      name: "copy-classic-scripts",
      apply: "build",
      closeBundle() {
        for (const p of STATIC_FILES) cpSync(p, `dist/${p}`, { recursive: true });
      },
    },
  ],
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["src/test/setup.js"],
  },
});
