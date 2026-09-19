import { expect, test } from '@playwright/test'

test('first launch asks for explicit preferences and remembers completion', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: 'What lights you up?' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue/ })).toBeDisabled()
  for (const topic of ['Creative practice', 'Books & ideas', 'Philosophy']) await page.getByRole('button', { name: topic }).click()
  await page.getByRole('button', { name: /Continue/ }).click()
  await page.getByRole('button', { name: /Curious/ }).click()
  await page.getByRole('button', { name: /Continue/ }).click()
  await page.getByRole('button', { name: /Learn/ }).click()
  await page.getByRole('button', { name: /Build my shelf/ }).click()
  await expect(page.getByRole('heading', { name: 'Read outside the usual loop.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'What lights you up?' })).toHaveCount(0)
})

test('public category and legal pages work without onboarding', async ({ page }) => {
  await page.goto('/explore/philosophy')
  await expect(page.getByRole('heading', { name: /Best free philosophy blogs/ })).toBeVisible()
  await expect(page.locator('.public-source-list article')).toHaveCount(4)
  await expect(page.getByRole('link', { name: 'Visit original' }).first()).toHaveAttribute('href', /^https:\/\//)
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: 'Privacy, in plain language.' })).toBeVisible()
  await expect(page.getByText('Private means private')).toBeVisible()
})
