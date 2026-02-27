import { test, expect } from '../fixtures/base.js';
import { injectAuth } from '../fixtures/base.js';
import { PortfolioPage } from '../pages/PortfolioPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';

test.describe('Navigation', () => {
  test('full cycle: portfolio → login → dashboard → portfolio', async ({ page }) => {
    // Start at portfolio
    const portfolio = new PortfolioPage(page);
    await portfolio.goto();
    await portfolio.waitForLoad();

    // Navigate to login
    await page.goto('/login');
    const login = new LoginPage(page);
    await login.waitForLoad();

    // Login with valid credentials
    await login.login('admin@example.com', 'secret123');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });

    // Verify dashboard loaded
    const dashboard = new DashboardPage(page);
    await dashboard.waitForLoad();

    // Navigate back to portfolio via the back button
    await dashboard.backToPortfolioButton.click();
    await expect(page).toHaveURL(/:\d+\/$/, { timeout: 10_000 });
  });

  test('redirects /dashboard to /login without auth', async ({ page }) => {
    // Override refresh to return 401 (no valid session)
    await page.route('http://127.0.0.1:8001/api/v1/auth/refresh', async (route) => {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not authenticated' }),
      });
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('Back to Portfolio link from login works', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.waitForLoad();
    await login.backLink.click();
    await expect(page).toHaveURL(/:\d+\/$/, { timeout: 10_000 });
  });

  test('unknown routes redirect to /', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page).toHaveURL(/:\d+\/$/, { timeout: 10_000 });
  });
});
