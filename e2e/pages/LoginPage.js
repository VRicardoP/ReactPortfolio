export class LoginPage {
  constructor(page) {
    this.page = page;
    this.container = page.locator('.login-container');
    this.title = page.locator('.login-container h1');
    this.usernameInput = page.locator('.login-container input[type="text"]');
    this.passwordInput = page.locator('.login-container input[type="password"]');
    this.submitButton = page.locator('.login-container button[type="submit"]');
    this.errorMessage = page.locator('.error-message');
    this.backLink = page.locator('.login-container a');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async waitForLoad() {
    await this.container.waitFor({ state: 'visible' });
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
