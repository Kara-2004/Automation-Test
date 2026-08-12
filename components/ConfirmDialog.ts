import { expect, type Locator, type Page } from '@playwright/test';

export class ConfirmDialog {
  readonly root: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Xác nhận xóa', exact: true });
    this.confirmButton = this.root.getByRole('button', { name: 'Xác nhận xóa', exact: true });
    this.cancelButton = this.root.getByRole('button', { name: 'Hủy', exact: true });
  }

  async confirm(): Promise<void> {
    await expect(this.root).toBeVisible();
    await this.confirmButton.click();
    await expect(this.root).toBeHidden();
  }
}
