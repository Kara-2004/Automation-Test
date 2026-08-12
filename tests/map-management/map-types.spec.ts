import { authStatePaths } from '../../fixtures/auth.fixture.js';
import { test, expect } from '../../fixtures/destructive-test.fixture.js';
import { MapTypePage, type MapTypeData } from '../../pages/MapTypePage.js';

test.use({ storageState: authStatePaths.admin });

function mapTypeData(generatedName: (module: string) => string, suffix: string): MapTypeData {
  return {
    code: generatedName(`LBD_${suffix}`),
    name: generatedName(`LOAI_BAN_DO_${suffix}`),
    description: `Automation ${suffix}`,
    sortOrder: 0,
  };
}

test('[TC_DDBD_QLBD_QLLBD_01_01] Thêm mới loại bản đồ @destructive @regression', async ({
  page,
  generatedName,
  destructiveEnabled,
  registerCleanup,
}) => {
  test.skip(!destructiveEnabled, 'CRUD chỉ chạy khi RUN_DESTRUCTIVE=true.');
  const mapTypePage = new MapTypePage(page);
  const data = mapTypeData(generatedName, 'CREATE');
  registerCleanup(() => mapTypePage.deleteIfPresent(data.name));

  await mapTypePage.goto();
  await mapTypePage.create(data);
  await mapTypePage.search(data.code);
  const row = await mapTypePage.expectSingleRow(data.code);
  await expect(row).toContainText(data.name);
});

test('[TC_DDBD_QLBD_QLLBD_01_02] Nút Làm mới đưa form về ban đầu @regression', async ({
  page,
  generatedName,
}) => {
  const mapTypePage = new MapTypePage(page);
  await mapTypePage.goto();
  await mapTypePage.resetCreateForm(mapTypeData(generatedName, 'RESET'));
});

test('[TC_DDBD_QLBD_QLLBD_01_03] Validation các trường bắt buộc @regression', async ({ page }) => {
  const mapTypePage = new MapTypePage(page);
  await mapTypePage.goto();
  await mapTypePage.submitEmptyCreateForm();
  await expect(mapTypePage.createDialog.getByRole('alert')).toHaveCount(2);
  await expect(mapTypePage.createDialog.getByText('Mã loại bản đồ không được để trống', { exact: true })).toBeVisible();
  await expect(mapTypePage.createDialog.getByText('Tên loại bản đồ không được để trống', { exact: true })).toBeVisible();
});

test('[TC_DDBD_QLBD_QLLBD_01_04] Không cho phép trùng mã loại bản đồ @destructive @regression', async ({
  page,
  generatedName,
  destructiveEnabled,
  registerCleanup,
}) => {
  test.skip(!destructiveEnabled, 'Kiểm tra unique constraint chỉ chạy khi RUN_DESTRUCTIVE=true.');
  const mapTypePage = new MapTypePage(page);
  const original = mapTypeData(generatedName, 'UNIQUE');
  const duplicate = { ...mapTypeData(generatedName, 'DUPLICATE'), code: original.code };
  registerCleanup(() => mapTypePage.deleteIfPresent(original.name));
  registerCleanup(() => mapTypePage.deleteIfPresent(duplicate.name));

  await mapTypePage.goto();
  await mapTypePage.create(original);
  await mapTypePage.openCreateDialog();
  await mapTypePage.fillDialog(mapTypePage.createDialog, duplicate);
  await mapTypePage.createDialog.getByRole('button', { name: 'Thêm mới', exact: true }).click();
  await expect(page.getByText('Thêm thất bại', { exact: true })).toBeVisible();
  await expect(mapTypePage.createDialog).toBeVisible();
});

test('[TC_DDBD_QLBD_QLLBD_01_06] Hiển thị thông tin chi tiết chính xác @destructive @regression', async ({
  page,
  generatedName,
  destructiveEnabled,
  registerCleanup,
}) => {
  test.skip(!destructiveEnabled, 'Test tạo dữ liệu riêng nên cần RUN_DESTRUCTIVE=true.');
  const mapTypePage = new MapTypePage(page);
  const data = mapTypeData(generatedName, 'DETAIL');
  registerCleanup(() => mapTypePage.deleteIfPresent(data.name));

  await mapTypePage.goto();
  await mapTypePage.create(data);
  await mapTypePage.search(data.code);
  const dialog = await mapTypePage.openDetails(data.code);
  await expect(dialog).toContainText(data.code);
  await expect(dialog).toContainText(data.name);
  await expect(dialog).toContainText(data.description ?? '');
});

test('[TC_DDBD_QLBD_QLLBD_01_07] Tìm kiếm loại bản đồ @smoke @regression', async ({ page }) => {
  const mapTypePage = new MapTypePage(page);
  await mapTypePage.goto();
  await mapTypePage.search('Bản đồ');
  await expect(mapTypePage.searchInput).toHaveValue('Bản đồ');
  await expect.poll(() => mapTypePage.table.dataRowContaining('Bản đồ').count()).toBeGreaterThan(0);
});

test('[TC_DDBD_QLBD_QLLBD_01_08] Sửa dữ liệu do test tạo @destructive @regression', async ({
  page,
  generatedName,
  destructiveEnabled,
  registerCleanup,
}) => {
  test.skip(!destructiveEnabled, 'CRUD chỉ chạy khi RUN_DESTRUCTIVE=true.');
  const mapTypePage = new MapTypePage(page);
  const data = mapTypeData(generatedName, 'EDIT');
  registerCleanup(() => mapTypePage.deleteIfPresent(data.name));

  await mapTypePage.goto();
  await mapTypePage.create(data);
  await mapTypePage.search(data.code);
  await mapTypePage.deactivate(data.code);
  await mapTypePage.search(data.code);
  await expect(await mapTypePage.expectSingleRow(data.code)).not.toContainText('Đã kích hoạt');
});

test('[TC_DDBD_QLBD_QLLBD_01_09] Xóa dữ liệu do test tạo @destructive @regression', async ({
  page,
  generatedName,
  destructiveEnabled,
  registerCleanup,
}) => {
  test.skip(!destructiveEnabled, 'CRUD chỉ chạy khi RUN_DESTRUCTIVE=true.');
  const mapTypePage = new MapTypePage(page);
  const data = mapTypeData(generatedName, 'DELETE');
  registerCleanup(() => mapTypePage.deleteIfPresent(data.name));

  await mapTypePage.goto();
  await mapTypePage.create(data);
  await mapTypePage.search(data.code);
  await mapTypePage.delete(data.code);
});
