import { expect, type Page } from '@playwright/test';

/** Public shell verified from the response at BASE_URL on 2026-07-30. */
export class HomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async expectPublicShell(): Promise<void> {
    await expect(this.page).toHaveTitle('Hệ thống thông tin TNMT');
    await expect(this.page.locator('#root')).toBeVisible();
  }

  async expectAuthenticated(): Promise<void> {
    await this.expectPublicShell();
    await expect(this.page.locator('header button[aria-haspopup="menu"]')).toBeVisible();
    await expect(this.page.getByRole('link', { name: /Quản trị/ })).toBeVisible();
  }

  async expectLoggedOut(): Promise<void> {
    await this.expectPublicShell();
    await expect(this.page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeVisible();
  }
}
