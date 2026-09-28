import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const recordMode = process.env.RECORD_MODE === 'true';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.fourseasons.com',
    headless: recordMode ? false : isCI,
    trace: recordMode ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: recordMode ? 'on' : 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    launchOptions: { slowMo: recordMode ? 250 : 0 },
  },
  projects: [
    {
      name: 'unit',
      testMatch: /unit\/.*\.spec\.ts/,
      use: {},
    },
    {
      name: 'e2e',
      testIgnore: /unit\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
