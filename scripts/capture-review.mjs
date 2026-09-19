import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import chromiumBinary, { inflate } from '@sparticuz/chromium'

const runtimeLibraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))
process.env.LD_LIBRARY_PATH = `${runtimeLibraries}/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`
const browser = await chromium.launch({ executablePath: await chromiumBinary.executablePath(), args: chromiumBinary.args.filter(argument => argument !== '--single-process'), headless: true })
const base = process.env.HEATT_URL ?? 'http://127.0.0.1:5173/'
const phase = process.env.CAPTURE_PHASE ?? 'after'
await mkdir(`artifacts/visual-review/${phase}`, { recursive: true })

async function pageWithState(state) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'light', reducedMotion: 'reduce', deviceScaleFactor: 1 })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(value => value ? localStorage.setItem('heatt-state', JSON.stringify(value)) : localStorage.clear(), state)
  await page.reload({ waitUntil: 'networkidle' })
  return page
}
async function shot(name, state, prepare) {
  const page = await pageWithState(state)
  if (prepare) await prepare(page)
  await page.screenshot({ path: `artifacts/visual-review/${phase}/${name}.png`, fullPage: false })
  await page.close()
}
try {
  await shot('ember-onboarding', null)
  await shot('midnight-home', { onboarded: true, theme: 'midnight' })
  await shot('paper-profile', { onboarded: true, theme: 'paper' }, async page => { await page.getByRole('button', { name: 'Open profile' }).click(); await page.getByRole('heading', { name: 'Guest Reader' }).waitFor(); await page.waitForTimeout(100) })
  await shot('landing', { onboarded: true, theme: 'ember' }, async page => { await page.getByRole('button', { name: 'Open profile' }).click(); await page.getByRole('button', { name: 'About Heatt' }).click(); await page.getByRole('heading', { name: 'Make room for what matters.' }).waitFor(); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100) })
  console.log(`Captured visual review set: ${phase}`)
} finally { await browser.close() }
