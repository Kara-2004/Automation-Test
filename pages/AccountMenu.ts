import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../utils/env.js';

export class AccountMenu {
  readonly trigger: Locator;
  readonly menu: Locator;
  readonly profileItem: Locator;
  readonly logoutItem: Locator;

  constructor(private readonly page: Page) {
    this.trigger = page.locator('header button[aria-haspopup="menu"]');
    this.menu = page.getByRole('menu');
    this.profileItem = this.menu.getByRole('menuitem', { name: 'Thông tin cá nhân', exact: true });
    this.logoutItem = this.menu.getByRole('menuitem', { name: 'Đăng xuất', exact: true });
  }

  async open(): Promise<void> {
    await expect(this.trigger).toHaveCount(1);
    await this.trigger.click();
    await expect(this.menu).toBeVisible();
  }

  async expectLogoutVisible(): Promise<void> {
    await expect(this.profileItem).toBeVisible();
    await expect(this.logoutItem).toBeVisible();
  }

  async logout(): Promise<void> {
    const homeUrl = new URL('/', env.baseUrl).href;
    await this.logoutItem.click({ noWaitAfter: true });
    await expect(this.page).toHaveURL(homeUrl);
    await expect(
      this.page.getByRole('button', { name: 'Đăng nhập', exact: true }),
    ).toBeVisible();
  }
}
