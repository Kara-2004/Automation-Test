import { test, expect } from '@playwright/test';
import { authStatePaths } from '../../fixtures/auth.fixture.js';
import { AccountMenu } from '../../pages/AccountMenu.js';
import { HomePage } from '../../pages/HomePage.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { env, hasAdminCredentials } from '../../utils/env.js';

test.use({ storageState: authStatePaths.admin });

test('[TC_DDBD_QTHT_DN_02_01] Hiển thị nút Đăng xuất @smoke @regression', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const accountMenu = new AccountMenu(page);
  await accountMenu.open();
  await accountMenu.expectLogoutVisible();
});

test('[TC_DDBD_QTHT_DN_02_02] Đăng xuất thành công @smoke @regression', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const accountMenu = new AccountMenu(page);
  await accountMenu.open();
  await accountMenu.logout();
  await new HomePage(page).expectLoggedOut();
});

test('[TC_DDBD_QTHT_DN_02_03] Đăng xuất và đăng nhập lại @regression', async ({ page }) => {
  test.skip(!hasAdminCredentials(), 'ADMIN_USERNAME và ADMIN_PASSWORD chưa được cấu hình.');
  const accountMenu = new AccountMenu(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await accountMenu.open();
  await accountMenu.logout();

  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(env.adminUsername, env.adminPassword);
  await expect(page).toHaveURL(new URL('/', env.baseUrl).href);
  await new HomePage(page).expectAuthenticated();
});
