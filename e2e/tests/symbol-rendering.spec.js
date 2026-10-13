import { test, expect, injectAuth } from '../fixtures/base.js';

const RISKY_SYMBOLS = /[\u2300-\u27BF\u2B00-\u2BFF\uFE0F\uFFFD\u{1F000}-\u{1FAFF}]/gu;

async function renderedRiskySymbols(page) {
  const surfaces = await page.locator('body').evaluate((body) => {
    const values = [{ source: 'body', text: body.textContent || '' }];
    for (const element of body.querySelectorAll('*')) {
      for (const pseudo of ['::before', '::after']) {
        const content = getComputedStyle(element, pseudo).content;
        if (content && content !== 'none' && content !== 'normal' && content !== '""') {
          values.push({
            source: `${element.tagName.toLowerCase()}.${element.className || ''}${pseudo}`,
            text: content,
          });
        }
      }
    }
    return values;
  });

  return surfaces.flatMap(({ source, text }) =>
    [...text.matchAll(RISKY_SYMBOLS)].map(match => ({ source, symbol: match[0] }))
  );
}

test('public portfolio has no font-dependent pictograms on desktop or mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.floating-window')).toHaveCount(11, { timeout: 15_000 });
  expect(await renderedRiskySymbols(page)).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.mobile-portfolio-container')).toBeVisible();
  await expect(page.locator('.mobile-section')).toHaveCount(9, { timeout: 15_000 });
  expect(await renderedRiskySymbols(page)).toEqual([]);
});

test('dashboard has no font-dependent pictograms in desktop windows or mobile tabs', async ({ page }) => {
  await injectAuth(page);
  await page.goto('/dashboard');
  await expect(page.locator('.floating-window')).toHaveCount(12, { timeout: 15_000 });
  expect(await renderedRiskySymbols(page)).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.mobile-dashboard-tabs')).toBeVisible();

  const tabCount = await page.locator('.mobile-dashboard-tab').count();
  expect(tabCount).toBe(5);
  for (let index = 0; index < tabCount; index += 1) {
    await page.locator('.mobile-dashboard-tab').nth(index).click();
    expect(await renderedRiskySymbols(page)).toEqual([]);
  }
});

test('login errors use a font-independent marker', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill('wrong@user.com');
  await page.getByPlaceholder('Password').fill('badpassword');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-marker')).toHaveText('!');
  expect(await renderedRiskySymbols(page)).toEqual([]);
});
