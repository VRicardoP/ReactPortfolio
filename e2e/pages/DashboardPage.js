export class DashboardPage {
  constructor(page) {
    this.page = page;
    this.header = page.locator('.dashboard-header');
    this.logoutButton = page.locator('.nav-button.logout');
    this.backToPortfolioButton = page.locator('.dashboard-nav .nav-button:not(.theme-button):not(.logout)');
    this.mainTitle = page.locator('.main-title');
    this.floatingWindows = page.locator('.floating-window');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForLoad() {
    await this.header.waitFor({ state: 'visible' });
  }

  async logout() {
    await this.logoutButton.click();
  }

  async getWindowById(id) {
    return this.page.locator(`#${id}`);
  }

  async minimizeWindow(id) {
    const window = this.page.locator(`#${id}`);
    await window.locator('.control-btn.control-minimize').click();
  }

  async isWindowMinimized(id) {
    const window = this.page.locator(`#${id}`);
    return window.evaluate(el => el.classList.contains('window-collapsed'));
  }
}
