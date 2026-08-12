import { expect, type Locator, type Page } from '@playwright/test';

export class ToastMessage {
  private readonly region: Locator;

  constructor(page: Page) {
    this.region = page.getByRole('region', { name: 'Notifications alt+T', exact: true });
  }

  async expectText(message: string): Promise<void> {
    await expect(this.region.getByText(message, { exact: true })).toBeVisible();
  }
}
