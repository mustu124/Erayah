import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const MOCK_RAZORPAY_PORT = Number(process.env.MOCK_RAZORPAY_PORT ?? 3199);

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
  // Tests a production build by default (closest to what shoppers get);
  // E2E_DEV=1 uses the dev server instead, E2E_BASE_URL a deployed preview.
  // E2E_CHECKOUT=1 also starts a fake Razorpay API and points the app at it.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        ...(process.env.E2E_CHECKOUT
          ? [
              {
                command: "node e2e/support/mock-razorpay.mjs",
                url: `http://localhost:${MOCK_RAZORPAY_PORT}/health`,
                env: { MOCK_RAZORPAY_PORT: String(MOCK_RAZORPAY_PORT) },
                reuseExistingServer: !process.env.CI,
              },
            ]
          : []),
        {
          command: process.env.E2E_DEV
            ? `pnpm exec next dev --port ${PORT}`
            : `pnpm exec next build && pnpm exec next start --port ${PORT}`,
          url: baseURL,
          env: process.env.E2E_CHECKOUT ? { RAZORPAY_API_BASE: `http://localhost:${MOCK_RAZORPAY_PORT}/v1` } : {},
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
        },
      ],
});
