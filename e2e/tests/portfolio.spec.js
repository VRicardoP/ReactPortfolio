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
});
