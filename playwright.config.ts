import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const mobile = { width: 375, height: 740 };
const desktop = { width: 1280, height: 800 };

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-375", use: { ...devices["Desktop Chrome"], viewport: mobile, isMobile: false } },
    { name: "chromium-1280", use: { ...devices["Desktop Chrome"], viewport: desktop } },
    { name: "webkit-375", use: { ...devices["iPhone 13"], viewport: mobile } },
    { name: "webkit-1280", use: { ...devices["Desktop Safari"], viewport: desktop } },
  ],
  // Reuses a running dev server; set E2E_BASE_URL to test a deployed preview.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm exec next dev --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
