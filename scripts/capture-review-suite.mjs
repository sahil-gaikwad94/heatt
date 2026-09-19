import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import chromiumBinary, { inflate } from '@sparticuz/chromium'

/* Full-surface visual review: onboarding, home (all 3 themes), reader,
   profile, landing, settings — saved to artifacts/visual-review/v3/. */

const runtimeLibraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))
process.env.LD_LIBRARY_PATH = `${runtimeLibraries}/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`

const browser = await chromium.launch({
  executablePath: await chromiumBinary.executablePath(),
  args: chromiumBinary.args.filter(argument => argument !== '--single-process'),
  headless: true,
})
const out = 'artifacts/visual-review/v3'
await mkdir(out, { recursive: true })

async function freshPage(viewport = { width: 1440, height: 1000 }) {
  const page = await browser.newPage({ viewport, colorScheme: 'light', reducedMotion: 'reduce' })
  await page.route(/r\.jina\.ai|allorigins\.win/, route => route.abort())
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  return page
}

async function onboard(page) {
  await page.getByRole('button', { name: 'Creative practice' }).click()
  await page.getByRole('button', { name: 'Philosophy' }).click()
  await page.getByRole('button', { name: 'Enter heatt' }).click()
  await page.waitForTimeout(500)
}

try {
  // 1. onboarding
  const onboarding = await freshPage()
  await onboarding.screenshot({ path: `${out}/01-onboarding.png` })
  await onboard(onboarding)
  await onboarding.screenshot({ path: `${out}/02-home-ember-top.png` })
  await onboarding.evaluate(() => window.scrollTo(0, 900))
  await onboarding.waitForTimeout(600)
  await onboarding.screenshot({ path: `${out}/03-home-ember-cards.png` })

  // 2. reader (blocked network -> offline state)
  await onboarding.getByTestId('blog-card').first().getByRole('button', { name: /Open flare/ }).click()
  await onboarding.waitForTimeout(900)
  await onboarding.screenshot({ path: `${out}/04-flare-reader.png` })
  await onboarding.getByRole('button', { name: 'Close' }).click()

  // 3. buddy chat
  await onboarding.getByRole('button', { name: /Chat with .+, your companion/ }).click()
  await onboarding.waitForTimeout(600)
  await onboarding.screenshot({ path: `${out}/05-buddy-chat.png` })
  await onboarding.getByRole('button', { name: 'Close chat' }).click()

  // 4. write-a-flare modal
  await onboarding.getByRole('button', { name: 'Write a flare' }).first().click()
  await onboarding.waitForTimeout(500)
  await onboarding.screenshot({ path: `${out}/06-create-flare.png` })
  await onboarding.getByRole('button', { name: 'Close' }).click()

  // 5. profile
  await onboarding.getByRole('button', { name: 'Open profile' }).click()
  await onboarding.waitForTimeout(700)
  await onboarding.screenshot({ path: `${out}/07-profile.png` })
  await onboarding.evaluate(() => window.scrollTo(0, 700))
  await onboarding.waitForTimeout(500)
  await onboarding.screenshot({ path: `${out}/08-profile-buddy.png` })

  // 6. landing
  await onboarding.evaluate(() => window.localStorage.setItem('heatt-landing-visit', '1'))
  await onboarding.evaluate(() => { const state = JSON.parse(window.localStorage.getItem('heatt-state')); state.onboarded = true; window.localStorage.setItem('heatt-state', JSON.stringify(state)) })
  await onboarding.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await onboarding.evaluate(() => { const state = JSON.parse(window.localStorage.getItem('heatt-state')); state.onboarded = true; window.localStorage.setItem('heatt-state', JSON.stringify(state)) })
  // navigate to landing via profile About link
  await onboarding.reload({ waitUntil: 'networkidle' })
  await onboarding.getByRole('button', { name: 'Open profile' }).click()
  await onboarding.getByRole('button', { name: 'About Heatt' }).click()
  await onboarding.waitForTimeout(900)
  await onboarding.screenshot({ path: `${out}/09-landing-hero.png` })
  await onboarding.evaluate(() => document.getElementById('shelves')?.scrollIntoView())
  await onboarding.waitForTimeout(700)
  await onboarding.screenshot({ path: `${out}/10-landing-shelves.png` })
  await onboarding.evaluate(() => document.getElementById('atmospheres')?.scrollIntoView())
  await onboarding.waitForTimeout(700)
  await onboarding.screenshot({ path: `${out}/11-landing-atmospheres.png` })

  // 7. settings
  await onboarding.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await onboarding.getByRole('button', { name: 'Settings' }).click()
  await onboarding.waitForTimeout(600)
  await onboarding.screenshot({ path: `${out}/12-settings.png` })

  // 8. midnight + ink themes on home
  for (const theme of ['midnight', 'ink']) {
    await onboarding.evaluate(themeValue => {
      const state = JSON.parse(window.localStorage.getItem('heatt-state'))
      state.theme = themeValue
      window.localStorage.setItem('heatt-state', JSON.stringify(state))
    }, theme)
    await onboarding.reload({ waitUntil: 'networkidle' })
    await onboarding.waitForTimeout(700)
    await onboarding.screenshot({ path: `${out}/13-home-${theme}.png` })
  }

  // 9. mobile home
  const mobile = await freshPage({ width: 390, height: 844 })
  await onboard(mobile)
  await mobile.waitForTimeout(600)
  await mobile.screenshot({ path: `${out}/14-mobile-home.png` })

  console.log(`Captured ${out}`)
} finally {
  await browser.close()
}
