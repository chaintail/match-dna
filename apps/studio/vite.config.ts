import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        story: resolve(__dirname, "story.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./test/setup.ts",
    coverage: { provider: "v8", reporter: ["text", "json-summary"] },
  },
});
