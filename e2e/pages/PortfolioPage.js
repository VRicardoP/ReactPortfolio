export class PortfolioPage {
  constructor(page) {
    this.page = page;
    this.mainTitle = page.locator('.main-title');
    this.typewriterContainer = page.locator('.typewriter-container');
    this.welcomeWindow = page.locator('[aria-labelledby="welcome-window-title"]');
    this.welcomeContent = page.locator('.welcome-content');
    this.gotItButton = page.locator('.close-welcome-btn');
    this.floatingWindows = page.locator('.floating-window');
  }

  async goto() {
    await this.page.goto('/');
  }

  async waitForLoad() {
    await this.mainTitle.waitFor({ state: 'visible' });
  }

  async dismissWelcome() {
    await this.gotItButton.click();
  }

  async getWindowById(id) {
    return this.page.locator(`#${id}`);
  }
}
