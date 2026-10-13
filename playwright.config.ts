import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: ["--enable-unsafe-swiftshader"],
      ...(process.env.HTTPS_PROXY
        ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } }
        : {}),
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "webkit",
      testMatch: "pwa.spec.ts",
      use: {
        ...devices["iPhone 13"],
        browserName: "webkit",
        launchOptions: {
          args: [],
          ...(process.env.HTTPS_PROXY
            ? { proxy: { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } }
            : {}),
        },
      },
    },
  ],
});
