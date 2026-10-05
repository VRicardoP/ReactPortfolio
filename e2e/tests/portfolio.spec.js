import { test, expect } from '../fixtures/base.js';
import { PortfolioPage } from '../pages/PortfolioPage.js';

test.describe('Portfolio Page', () => {
  let portfolio;

  test.beforeEach(async ({ page }) => {
    portfolio = new PortfolioPage(page);
    await portfolio.goto();
  });

  test('loads and shows main title', async () => {
    await portfolio.waitForLoad();
    await expect(portfolio.mainTitle).toBeVisible();
  });

  test('shows typewriter with "Vicente"', async () => {
    await portfolio.waitForLoad();
    await expect(portfolio.typewriterContainer).toBeVisible();
    // Typewriter animates text — wait for "Vicente" to appear
    await expect(portfolio.typewriterContainer).toContainText('Vicente', { timeout: 10_000 });
  });

  test('welcome window is visible with Got it button', async () => {
    // Welcome window is lazy-loaded, wait longer
    await expect(portfolio.welcomeWindow).toBeVisible({ timeout: 10_000 });
    await expect(portfolio.gotItButton).toBeVisible();
    // Dismiss it
    await portfolio.dismissWelcome();
    await expect(portfolio.welcomeWindow).not.toBeVisible();
  });

  test('cube background rotates from free space without stealing window drag', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('portfolio-background', 'cube'));
    await page.reload();

    const canvas = page.locator('main canvas').first();
    await expect(canvas).toHaveCSS('pointer-events', 'auto');

    const topWindow = page.locator('.floating-window').last();
    const before = await topWindow.boundingBox();
    const header = await topWindow.locator('.window-header').boundingBox();
    expect(before).not.toBeNull();
    expect(header).not.toBeNull();

    await page.mouse.move(header.x + header.width / 2, header.y + header.height / 2);
    await page.mouse.down();
    await page.mouse.move(header.x + header.width / 2 - 50, header.y + header.height / 2 - 25, { steps: 5 });
    await page.mouse.up();

    const after = await topWindow.boundingBox();
    expect(Math.abs(after.x - before.x)).toBeGreaterThan(30);

    const canvasPoint = await canvas.evaluate((node) => {
      for (let y = window.innerHeight - 25; y >= 100; y -= 25) {
        for (let x = window.innerWidth - 25; x >= 25; x -= 25) {
          if (document.elementFromPoint(x, y) === node) return { x, y };
        }
      }
      return null;
    });
    expect(canvasPoint).not.toBeNull();

    await canvas.evaluate((node) => {
      window.__cubePointerDowns = 0;
      window.__cubePointerCaptures = 0;
      node.addEventListener('pointerdown', () => { window.__cubePointerDowns += 1; });
      node.addEventListener('gotpointercapture', () => { window.__cubePointerCaptures += 1; });
    });
    await page.mouse.move(canvasPoint.x, canvasPoint.y);
    await page.mouse.down();
    await page.mouse.move(canvasPoint.x - 100, canvasPoint.y - 60, { steps: 5 });
    await page.mouse.up();

    const interaction = await page.evaluate(() => ({
      downs: window.__cubePointerDowns,
      captures: window.__cubePointerCaptures,
    }));
    expect(interaction.downs).toBe(1);
    expect(interaction.captures).toBeGreaterThan(0);
  });
});
