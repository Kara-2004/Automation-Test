import { expect, type Locator, type Page } from '@playwright/test';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { DataTable } from '../components/DataTable.js';
import { ToastMessage } from '../components/ToastMessage.js';

export type MapTypeData = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
};

export class MapTypePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly table: DataTable;
  readonly toast: ToastMessage;
  readonly confirmDialog: ConfirmDialog;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Loại bản đồ', exact: true });
    this.searchInput = page.getByPlaceholder('Tìm kiếm theo tên loại bản đồ...', { exact: true });
    this.addButton = page.getByRole('button', { name: 'Thêm mới', exact: true });
    this.table = new DataTable(page.getByRole('table'));
    this.toast = new ToastMessage(page);
    this.confirmDialog = new ConfirmDialog(page);
  }

  get createDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Thêm mới loại bản đồ', exact: true });
  }

  get editDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Chỉnh sửa loại bản đồ', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/loai-ban-do', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/admin\/loai-ban-do$/);
    await expect(this.heading).toBeVisible();
    await expect(this.table.root).toBeVisible();
  }

  async expectStructure(): Promise<void> {
    await expect(this.searchInput).toBeVisible();
    await expect(this.addButton).toBeVisible();
    await this.table.expectHeaders([
      'ID',
      'Mã loại bản đồ',
      'Tên loại bản đồ',
      'Mô tả',
      'Kích hoạt',
      'Hành động',
    ]);
  }

  async openCreateDialog(): Promise<void> {
    await this.addButton.click();
    await expect(this.createDialog).toBeVisible();
  }

  private codeInput(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: 'Mã loại bản đồ *', exact: true });
  }

  private nameInput(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: 'Tên loại bản đồ *', exact: true });
  }

  private descriptionInput(dialog: Locator): Locator {
    return dialog.getByRole('textbox', { name: 'Mô tả', exact: true });
  }

  async fillDialog(dialog: Locator, data: MapTypeData): Promise<void> {
    await this.codeInput(dialog).fill(data.code);
    await this.nameInput(dialog).fill(data.name);
    await this.descriptionInput(dialog).fill(data.description ?? `Automation data for ${data.code}`);
    await dialog
      .getByRole('spinbutton', { name: 'Thứ tự sắp xếp', exact: true })
      .fill(String(data.sortOrder ?? 0));
  }

  async create(data: MapTypeData): Promise<void> {
    await this.openCreateDialog();
    await this.fillDialog(this.createDialog, data);
    await this.createDialog.getByRole('button', { name: 'Thêm mới', exact: true }).click();
    await this.toast.expectText('Thêm thành công');
    await expect(this.createDialog).toBeHidden();
  }

  async resetCreateForm(data: MapTypeData): Promise<void> {
    await this.openCreateDialog();
    await this.fillDialog(this.createDialog, data);
    await this.createDialog.getByRole('button', { name: 'Làm mới', exact: true }).click();
    await expect(this.codeInput(this.createDialog)).toHaveValue('');
    await expect(this.nameInput(this.createDialog)).toHaveValue('');
    await expect(this.descriptionInput(this.createDialog)).toHaveValue('');
    await expect(this.createDialog.getByRole('spinbutton', { name: 'Thứ tự sắp xếp', exact: true })).toHaveValue('0');
  }

  async submitEmptyCreateForm(): Promise<void> {
    await this.openCreateDialog();
    await this.createDialog.getByRole('button', { name: 'Thêm mới', exact: true }).click();
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  row(identifier: string): Locator {
    return this.table.rowContaining(identifier);
  }

  async expectSingleRow(identifier: string): Promise<Locator> {
    const row = this.row(identifier);
    await expect(row).toHaveCount(1);
    await expect(row).toBeVisible();
    return row;
  }

  async openDetails(identifier: string): Promise<Locator> {
    const row = await this.expectSingleRow(identifier);
    await row.getByRole('button', { name: 'Thông tin chi tiết', exact: true }).click();
    const dialog = this.page.getByRole('dialog', { name: 'Thông tin chi tiết', exact: true });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async openEdit(identifier: string): Promise<Locator> {
    const row = await this.expectSingleRow(identifier);
    await row.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await expect(this.editDialog).toBeVisible();
    return this.editDialog;
  }

  async updateName(identifier: string, name: string): Promise<void> {
    const dialog = await this.openEdit(identifier);
    await this.nameInput(dialog).fill(name);
    await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
    await this.toast.expectText('Cập nhật thành công');
    await expect(dialog).toBeHidden();
  }

  async deactivate(identifier: string): Promise<void> {
    const dialog = await this.openEdit(identifier);
    const status = dialog.getByRole('switch', { name: 'Trạng thái kích hoạt', exact: true });
    if (await status.isChecked()) await status.uncheck();
    await dialog.getByRole('button', { name: 'Cập nhật', exact: true }).click();
    await this.toast.expectText('Cập nhật thành công');
    await expect(dialog).toBeHidden();
  }

  async delete(identifier: string): Promise<void> {
    const row = await this.expectSingleRow(identifier);
    await row.getByRole('button', { name: 'Xóa', exact: true }).click();
    await this.confirmDialog.confirm();
    await this.toast.expectText('Xóa thành công');
    await expect(this.row(identifier)).toHaveCount(0);
  }

  async deleteIfPresent(identifier: string): Promise<void> {
    await this.goto();
    await this.search(identifier);
    const row = this.row(identifier);
    const count = await row.count();
    if (count === 0) return;
    if (count !== 1) throw new Error(`Refusing cleanup: expected one owned row for ${identifier}, found ${count}`);
    await this.delete(identifier);
  }
}
