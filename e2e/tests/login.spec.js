import { test, expect } from '../fixtures/base.js';
import { LoginPage } from '../pages/LoginPage.js';

test.describe('Login Page', () => {
  let login;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    await login.goto();
    await login.waitForLoad();
  });

  test('shows login form with title', async () => {
    await expect(login.title).toBeVisible();
    await expect(login.usernameInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.submitButton).toBeVisible();
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await login.login('wrong@user.com', 'badpassword');
    await expect(login.errorMessage).toBeVisible({ timeout: 10_000 });
  });

  test('redirects to dashboard with valid credentials', async ({ page }) => {
    await login.login('admin@example.com', 'secret123');
    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('validates empty username', async () => {
    await login.passwordInput.fill('somepassword');
    await login.submitButton.click();
    // Form validation prevents submission — username is required
    const isInvalid = await login.usernameInput.evaluate(el => !el.validity.valid || el.value === '');
    expect(isInvalid).toBeTruthy();
  });

  test('validates empty password', async () => {
    await login.usernameInput.fill('someuser');
    await login.submitButton.click();
    // Form validation prevents submission — password is required
    const isInvalid = await login.passwordInput.evaluate(el => !el.validity.valid || el.value === '');
    expect(isInvalid).toBeTruthy();
  });

  test('has Back to Portfolio link', async ({ page }) => {
    await expect(login.backLink).toBeVisible();
    await login.backLink.click();
    await expect(page).toHaveURL(/:\d+\/$/, { timeout: 10_000 });
  });
});
