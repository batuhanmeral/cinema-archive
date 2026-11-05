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
