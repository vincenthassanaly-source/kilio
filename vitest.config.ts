import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Les specs Playwright (e2e/*.spec.ts) utilisent `test.describe` du
    // runner Playwright, incompatible avec Vitest : ce projet colocalise
    // les tests unitaires dans src/ (*.test.tsx), donc restreindre le
    // périmètre suffit à les exclure sans toucher à e2e/.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
