import path from 'node:path'
import { defineConfig } from '@playwright/test'
import chromiumBinary, { inflate } from '@sparticuz/chromium'

// The serverless Chromium package ships the current NSS/NSPR libraries in its
// Amazon Linux layer. Extract and point the browser at them so the same E2E
// suite runs in this minimal sandbox without a system-browser dependency.
const runtimeLibraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))
process.env.LD_LIBRARY_PATH = `${runtimeLibraries}/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`
const executablePath = await chromiumBinary.executablePath()

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    launchOptions: {
      executablePath,
      args: chromiumBinary.args.filter(argument => argument !== '--single-process'),
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
})
