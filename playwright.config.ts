import { defineConfig, devices } from "@playwright/test";

// Rig instant() : voir instant-nav.rig.md. Les tests tournent contre un
// build de production (`next build && next start`) lancé par
// e2e/run-instant-rig.sh, jamais contre `next dev`.
const baseURL = process.env.BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  // Un test instant() est déterministe : pas de retry (voir
  // .claude/skills/next-cache-components-optimizer/reference/red-test-robustness.md).
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
});
