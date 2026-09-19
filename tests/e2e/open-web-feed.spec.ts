import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: 'Creative practice' }).click()
  await page.getByRole('button', { name: 'Books & ideas' }).click()
  await page.getByRole('button', { name: 'Philosophy' }).click()
  await page.getByRole('button', { name: 'Enter heatt' }).click()
})

test('cold-start feed uses real original sources and saves a source locally', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Read outside the usual loop.' })).toBeVisible()
  await expect(page.getByText('53', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('13', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Real sources, no invented activity.')).toBeVisible()

  const cards = page.getByTestId('blog-card')
  await expect(cards).toHaveCount(8)
  await expect(cards.first().getByText('FREE TO READ')).toBeVisible()

  await cards.first().getByRole('button', { name: 'Save source' }).click()
  await expect(cards.first().getByRole('button', { name: 'On your shelf' })).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('blog-card').first().getByRole('button', { name: 'On your shelf' })).toBeVisible()
  await page.getByTestId('category-filter').getByRole('button', { name: /My reads/ }).click()
  await expect(page.getByTestId('blog-card')).toHaveCount(1)
})

test('blog cards open the flare reader in-app instead of redirecting', async ({ page }) => {
  await page.route(/r\.jina\.ai|allorigins\.win/, route => route.abort())

  const card = page.getByTestId('blog-card').first()
  await card.getByRole('button', { name: /Open flare/ }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('original owner', { exact: true })).toBeVisible()
  await expect(dialog.getByTestId('visit-blog')).toHaveAttribute('href', /^https:\/\//)
  await expect(dialog.getByTestId('visit-blog')).toHaveAttribute('target', '_blank')

  // heat the flare from inside the reader, then close it
  await dialog.getByTestId('heat-button').click()
  await expect(dialog.getByTestId('heat-button')).toContainText('warm')
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByTestId('blog-card').first()).toBeVisible()
})

test('feed appends automatically and categories produce a finite organized shelf', async ({ page }) => {
  const cards = page.getByTestId('blog-card')
  const initialCount = await cards.count()
  expect(initialCount).toBe(8)

  await page.getByTestId('infinite-scroll-sentinel').scrollIntoViewIfNeeded()
  await expect.poll(() => cards.count()).toBeGreaterThan(initialCount)
  await expect(page.getByText('Keep going · more reads load automatically')).toBeVisible()

  await page.getByTestId('category-filter').getByRole('button', { name: /Poetry & language/ }).click()
  await expect(cards).toHaveCount(4)
  await expect(page.getByText('You have reached every source in this shelf.')).toBeVisible()
  for (const card of await cards.all()) {
    await expect(card.getByText('Poetry & language', { exact: true })).toBeVisible()
  }
})

test('a guest can publish a local flare without fabricated engagement', async ({ page }) => {
  await page.getByRole('button', { name: 'Write a flare' }).first().click()
  await page.getByPlaceholder('What is taking up a little space in your mind?').fill('A small flare from the first real reader.')
  await page.getByRole('button', { name: 'Publish flare' }).click()

  await expect(page.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('A small flare from the first real reader.')).toBeVisible()
  await expect(page.getByText('0 replies')).toBeHidden()
  await page.reload()
  await page.getByRole('tab', { name: 'Following' }).click()
  await expect(page.getByText('A small flare from the first real reader.')).toBeVisible()
})

test('the companion dock is alive on home and chats on-device', async ({ page }) => {
  const dock = page.getByRole('button', { name: /Chat with .+, your companion/ })
  await expect(dock).toBeVisible()
  await dock.click()

  const chat = page.getByRole('dialog', { name: /Chat with/ })
  await expect(chat).toBeVisible()
  await chat.getByRole('button', { name: 'Find me something to read' }).click()
  await expect(chat.locator('.chat-bubble')).toHaveCount(2)
  await expect(chat.locator('.chat-bubble.from-buddy').first()).not.toBeEmpty()
  await chat.getByRole('button', { name: 'Close chat' }).click()
  await expect(chat).toHaveCount(0)
})

test('search, empty community state, and mobile navigation remain usable', async ({ page }, testInfo) => {
  await page.getByRole('textbox', { name: 'Search Heatt' }).fill('robotics')
  await expect(page.getByTestId('blog-card')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'IEEE Spectrum' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search' }).click()

  await page.getByRole('tab', { name: 'Following' }).click()
  await expect(page.getByRole('heading', { name: 'No voices to follow yet' })).toBeVisible()
  await expect(page.getByText('Maya Chen')).toHaveCount(0)
  await page.getByRole('button', { name: 'Explore free blogs' }).click()
  await expect(page.getByText('Real sources, no invented activity.')).toBeVisible()

  if (testInfo.project.name === 'mobile') {
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()
    await expect(page.getByTestId('blog-card').first().getByRole('button', { name: /Open flare/ })).toBeVisible()
  }
})
