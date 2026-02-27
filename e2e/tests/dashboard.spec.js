import { test, expect } from '../fixtures/base.js';
import { injectAuth } from '../fixtures/base.js';
import { DashboardPage } from '../pages/DashboardPage.js';

test.describe('Dashboard Page', () => {
  let dashboard;

  test.beforeEach(async ({ page }) => {
    await injectAuth(page);
    dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.waitForLoad();
  });

  test('loads with header and nav buttons', async () => {
    await expect(dashboard.header).toBeVisible();
    await expect(dashboard.logoutButton).toBeVisible();
    await expect(dashboard.backToPortfolioButton).toBeVisible();
  });

  test('shows floating windows', async () => {
    // Dashboard windows are lazy-loaded, wait for at least one
    await dashboard.floatingWindows.first().waitFor({ state: 'visible', timeout: 15_000 });
    const count = await dashboard.floatingWindows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('minimize and restore a window', async ({ page }) => {
    // useWindowLayout auto-minimizes all windows after ~3s.
    // Wait for auto-minimize to complete before testing manual toggle.
    const win = page.locator('[aria-labelledby="stats-window-title"]');
    await win.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(win).toHaveClass(/window-collapsed/, { timeout: 15_000 });

    // Click minimize button to restore (toggle)
    await win.getByRole('button', { name: 'Minimize' }).click();
    await expect(win).not.toHaveClass(/window-collapsed/, { timeout: 5_000 });

    // Click minimize button again to collapse
    await win.getByRole('button', { name: 'Minimize' }).click();
    await expect(win).toHaveClass(/window-collapsed/, { timeout: 5_000 });
  });

  test('logout redirects to login', async ({ page }) => {
    await dashboard.logout();
    await page.waitForURL('**/login', { timeout: 5_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
