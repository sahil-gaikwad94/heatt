import path from 'node:path'
import chromiumBinary, { inflate } from '@sparticuz/chromium'
import { chromium } from '@playwright/test'

/* DOM + computed-style audit: proves the Tailwind layer resolves, images load,
   themes switch app-wide, and no console errors fire on any surface. */

const runtimeLibraries = await inflate(path.resolve('node_modules/@sparticuz/chromium/bin/al2023.tar.br'))
process.env.LD_LIBRARY_PATH = `${runtimeLibraries}/lib${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ''}`
const browser = await chromium.launch({
  executablePath: await chromiumBinary.executablePath(),
  args: chromiumBinary.args.filter(a => a !== '--single-process'),
  headless: true,
})

const problems = []
const note = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) problems.push(label)
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const consoleErrors = []
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(String(error)))
  await page.route(/r\.jina\.ai|allorigins\.win/, route => route.abort())
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })

  // onboarding -> home
  await page.getByRole('button', { name: 'Creative practice' }).click()
  await page.getByRole('button', { name: 'Enter heatt' }).click()
  await page.waitForTimeout(700)

  // blog cards: tailwind + art
  const cardAudit = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="blog-card"]')
    if (!card) return { found: false }
    const style = getComputedStyle(card)
    const img = card.querySelector('img')
    return {
      found: true,
      radius: style.borderRadius,
      borderColor: style.borderColor,
      hasArt: Boolean(img) && img.naturalWidth > 0,
      artSrc: img?.getAttribute('src') ?? '',
    }
  })
  note(cardAudit.found, 'blog card rendered')
  note(cardAudit.radius === '22px', 'tailwind rounded-[22px] resolves', `radius=${cardAudit.radius}`)
  note(cardAudit.hasArt, 'category art loads on card', cardAudit.artSrc)

  // all category art + buddy art reachable
  const artAudit = await page.evaluate(async () => {
    const results = []
    for (const src of document.querySelectorAll('img')) {
      if (!src.src) continue
      const response = await fetch(src.src).catch(() => ({ ok: false }))
      results.push({ src: src.getAttribute('src'), ok: response.ok })
    }
    return results
  })
  note(artAudit.length > 0 && artAudit.every(item => item.ok), 'all rendered images fetch OK', `${artAudit.filter(i => i.ok).length}/${artAudit.length}`)

  // theme switching is app-wide
  for (const theme of ['midnight', 'ink', 'ember']) {
    await page.click('header.topbar .avatar') // profile
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Settings' }).last().click().catch(async () => {
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Settings' }).click()
    })
    await page.waitForTimeout(300)
    await page.getByTestId(`theme-${theme}`).click()
    await page.waitForTimeout(700)
    const applied = await page.evaluate(() => document.documentElement.dataset.theme)
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    note(applied === theme, `theme ${theme} applied on <html>`, `bg=${bodyBg}`)
  }

  // heat button intensity ramp on home card -> reader
  await page.getByRole('button', { name: 'Home' }).first().click().catch(() => page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Home' }).click())
  await page.waitForTimeout(400)
  await page.getByTestId('blog-card').first().getByRole('button', { name: /Open flare/ }).click()
  await page.waitForTimeout(500)
  const heatWords = []
  for (let tap = 0; tap < 4; tap++) {
    await page.getByTestId('heat-button').click()
    await page.waitForTimeout(250)
    heatWords.push(await page.locator('[data-testid="heat-button"] .heat-word').innerText())
  }
  note(
    heatWords[0] === 'warm' && heatWords[1] === 'ember' && heatWords[2] === 'blazing' && heatWords[3] === 'cooled',
    'heat ramp 1→2→3→cool animates',
    heatWords.join(' → '),
  )
  const pips = await page.evaluate(() => document.querySelectorAll('[data-testid="heat-button"] .pip.lit').length)
  note(pips === 0, 'pips extinguished after cool', `lit=${pips}`)

  // profile: avatar ring + stats + buddy card
  await page.getByRole('button', { name: 'Close' }).click()
  await page.waitForTimeout(300)
  await page.click('header.topbar .avatar')
  await page.waitForTimeout(700)
  const profileAudit = await page.evaluate(() => ({
    ring: Boolean(document.querySelector('.avatar-heat-ring')),
    tiles: document.querySelectorAll('.profile-page [role="heading"], .profile-page article').length,
    buddy: Boolean(document.querySelector('.buddy-card')),
    warmth: document.querySelector('.buddy-warmth')?.textContent?.trim() ?? '',
    stats: Array.from(document.querySelectorAll('.profile-page article strong')).slice(0, 6).map(node => node.textContent),
  }))
  note(profileAudit.ring, 'avatar heat ring present on profile')
  note(profileAudit.tiles >= 5, 'animated stat tiles rendered', `tiles=${profileAudit.tiles}`)
  note(profileAudit.buddy, 'buddy interaction card present', profileAudit.warmth)

  // buddy dock on home
  await page.getByRole('button', { name: 'Home' }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  const dock = await page.evaluate(() => Boolean(document.querySelector('.buddy-dock')) && Boolean(document.querySelector('.buddy-dock img')))
  note(dock, 'companion dock alive on home corner')

  // landing: hero, shelves, companions, atmospheres, heat demo
  await page.click('header.topbar .avatar')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'About Heatt' }).click()
  await page.waitForTimeout(900)
  const landingAudit = await page.evaluate(() => ({
    hero: Boolean(document.querySelector('.landing-page h1')),
    embers: document.querySelectorAll('.landing-embers i, [class*="animate-ember-rise"]').length,
    heatDemo: Boolean(document.querySelector('[data-testid="heat-demo"]')),
    shelfCards: document.querySelectorAll('#shelves img').length,
    buddies: document.querySelectorAll('#companions .buddy-show-card, #companions .buddy-sprite, #companions img').length,
    themes: document.querySelectorAll('#atmospheres button').length,
  }))
  note(landingAudit.hero, 'landing hero present')
  note(landingAudit.embers > 0, 'embers drifting on landing', `count=${landingAudit.embers}`)
  note(landingAudit.heatDemo, 'playable heat demo on landing')
  note(landingAudit.shelfCards === 13, 'all 13 shelf artworks on landing', `count=${landingAudit.shelfCards}`)
  note(landingAudit.buddies >= 5, 'companions showcased on landing', `count=${landingAudit.buddies}`)
  note(landingAudit.themes === 3, 'three atmospheres tryable on landing')

  // try a theme from the landing
  await page.locator('#atmospheres button').nth(1).click()
  await page.waitForTimeout(600)
  const landingTheme = await page.evaluate(() => document.documentElement.dataset.theme)
  note(landingTheme === 'midnight', 'landing theme try-on applies app-wide', landingTheme)

  // console errors across everything
  const relevantErrors = consoleErrors.filter(text => !text.includes('Failed to load resource') && !text.includes('the server responded with a status'))
  note(relevantErrors.length === 0, 'no console errors across surfaces', relevantErrors.slice(0, 3).join(' | '))

  console.log(problems.length === 0 ? '\nAUDIT CLEAN' : `\nAUDIT PROBLEMS: ${problems.length}`)
} finally {
  await browser.close()
}
