import { expect, type Locator } from '@playwright/test';

export class DataTable {
  constructor(readonly root: Locator) {}

  rowContaining(text: string): Locator {
    return this.root.getByRole('row').filter({ hasText: text });
  }

  dataRowContaining(text: string): Locator {
    return this.root.locator('tbody').getByRole('row').filter({ hasText: text });
  }

  async expectHeaders(headers: string[]): Promise<void> {
    for (const header of headers) {
      await expect(this.root.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
    }
  }
}
