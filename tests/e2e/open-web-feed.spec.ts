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
  const originalLink = cards.first().getByTestId('visit-blog')
  await expect(originalLink).toHaveAttribute('href', /^https:\/\//)
  await expect(originalLink).toHaveAttribute('target', '_blank')

  await cards.first().getByRole('button', { name: 'Save source' }).click()
  await expect(cards.first().getByRole('button', { name: 'On your shelf' })).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('blog-card').first().getByRole('button', { name: 'On your shelf' })).toBeVisible()
  await page.getByTestId('category-filter').getByRole('button', { name: /My reads/ }).click()
  await expect(page.getByTestId('blog-card')).toHaveCount(1)
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

test('a guest can publish a local thought without fabricated engagement', async ({ page }) => {
  await page.getByRole('button', { name: 'Share a thought' }).click()
  await page.getByPlaceholder('What is taking up a little space in your mind?').fill('A small thought from the first real reader.')
  await page.getByRole('button', { name: 'Publish thought' }).click()

  await expect(page.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('A small thought from the first real reader.')).toBeVisible()
  await expect(page.getByText('0 replies')).toBeHidden()
  await page.reload()
  await page.getByRole('tab', { name: 'Following' }).click()
  await expect(page.getByText('A small thought from the first real reader.')).toBeVisible()
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
    await expect(page.getByTestId('blog-card').first().getByTestId('visit-blog')).toBeVisible()
  }
})
