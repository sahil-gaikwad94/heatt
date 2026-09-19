import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import chromiumBinary, { inflate } from '@sparticuz/chromium'

const runtimeLibraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))
process.env.LD_LIBRARY_PATH = `${runtimeLibraries}/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`

const browser = await chromium.launch({
  executablePath: await chromiumBinary.executablePath(),
  args: chromiumBinary.args.filter(argument => argument !== '--single-process'),
  headless: true,
})

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  })
  await page.goto(process.env.HEATT_URL ?? 'http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.onboarding-page') ? 0 : 450))
  await page.waitForTimeout(400)
  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/heatt-open-web-feed.png', fullPage: false })
  console.log('Captured artifacts/heatt-open-web-feed.png')
} finally {
  await browser.close()
}
