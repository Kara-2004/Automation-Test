import { defineConfig, devices } from '@playwright/test';
import { env } from './utils/env.js';

export default defineConfig({
  testDir: './tests',
  // Keep tests inside one spec sequential (especially SSO flows), while
  // independent spec files can still run in parallel across two workers.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      './reporters/test-case-summary-reporter.ts',
      { outputDir: 'test-results', filePrefix: 'test-summary' },
    ],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: env.baseUrl,
    proxy: env.playwrightProxy ? { server: env.playwrightProxy } : undefined,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    launchOptions: { headless: env.headless, slowMo: env.slowMo },
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /.*\.setup\.ts/,
      fullyParallel: false,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['auth-setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['auth-setup'],
    },
  ],
});
