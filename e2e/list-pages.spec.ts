import { expect, test } from '@playwright/test'

for (const path of ['/movements', '/collections', '/en/movements', '/en/collections']) {
  test(`${path} has no horizontal scroll and a solid navbar`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByRole('banner')).toHaveClass(/bg-hall/)
  })
}

test('movement list notes select the same Istanbul week', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-09T00:00:00+03:00'))
  for (const prefix of ['', '/en']) {
    await page.goto(`${prefix}/movements`)
    await expect(page.locator('[data-strip-slot=w8] [data-note=current]')).toBeVisible()
    await expect(page.locator('[data-strip-slot=w9] [data-note=next]')).toBeVisible()
    await expect(page.locator('[data-note=current]:visible')).toHaveCount(1)
    await expect(page.locator('[data-note=next]:visible')).toHaveCount(1)
  }
})
