import { defineConfig, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:4173'

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE_URL, trace: 'on-first-retry' },
  // Testler statik dışa aktarımı (`out/`) sınar; önce `pnpm build` çalışmalı.
  webServer: { command: 'pnpm serve:out', url: BASE_URL, reuseExistingServer: !process.env.CI },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } },
    },
  ],
})
