import { authStatePaths } from '../../fixtures/auth.fixture.js';
import { test, expect } from '../../fixtures/destructive-test.fixture.js';
import { MapTypePage } from '../../pages/MapTypePage.js';
import { env } from '../../utils/env.js';

test.use({ storageState: authStatePaths.admin });

test('[TC_DDBD_QLBD_QLLBD_01_05] Stored XSS loại bản đồ với payload vô hại @security @destructive', async ({
  page,
  generatedName,
  destructiveEnabled,
  registerCleanup,
}) => {
  test.skip(!env.runSecurity || !destructiveEnabled, 'XSS cần RUN_SECURITY=true và RUN_DESTRUCTIVE=true.');
  const mapTypePage = new MapTypePage(page);
  const code = generatedName('LBD_XSS');
  const originalName = generatedName('LOAI_BAN_DO_XSS');
  const payload = `<img src=x onerror=alert('xss')>`;
  let executedDialog: string | undefined;
  page.on('dialog', async (dialog) => {
    executedDialog = dialog.message();
    await dialog.dismiss();
  });
  registerCleanup(() => mapTypePage.deleteIfPresent(code));

  await mapTypePage.goto();
  await mapTypePage.create({ code, name: originalName, description: 'Safe XSS fixture' });
  await mapTypePage.search(code);
  await mapTypePage.updateName(code, payload);
  await page.reload();
  await mapTypePage.search(code);

  expect(executedDialog, `JavaScript đã thực thi: ${executedDialog ?? ''}`).toBeUndefined();
  await expect(await mapTypePage.expectSingleRow(code)).toContainText(payload);
});
