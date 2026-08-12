import { test, expect } from '@playwright/test';
import { HomePage } from '../../pages/HomePage.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { env, hasAdminCredentials } from '../../utils/env.js';

test('[TC_DDBD_QTHT_DN_01_01] Kiểm tra hiển thị form đăng nhập @smoke @regression', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await test.step('Mở hệ thống và nhấn Đăng nhập', async () => loginPage.open());
  await test.step('Kiểm tra các trường chính nằm trong viewport', async () => {
    await loginPage.expectFormVisible();
    await expect(loginPage.usernameInput).toBeInViewport();
    await expect(loginPage.passwordInput).toBeInViewport();
    await expect(loginPage.submitButton).toBeInViewport();
  });
});

test('[TC_DDBD_QTHT_DN_01_02] Kiểm tra hiển thị chi tiết popup @smoke @regression', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await expect(loginPage.heading).toHaveText('ĐĂNG NHẬP SSO');
  await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'Nhập tên đăng nhập');
  await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Nhập mật khẩu');
});

test('[TC_DDBD_QTHT_DN_01_03] Đăng nhập với tài khoản hợp lệ @smoke @regression', async ({ page }) => {
  test.skip(!hasAdminCredentials(), 'ADMIN_USERNAME và ADMIN_PASSWORD chưa được cấu hình.');
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(env.adminUsername, env.adminPassword);
  await new HomePage(page).expectAuthenticated();
});

test('[TC_DDBD_QTHT_DN_01_04] Tài khoản sai và mật khẩu đúng @regression', async ({ page }, testInfo) => {
  test.skip(!hasAdminCredentials(), 'Cần mật khẩu môi trường để giữ đúng bước Excel.');
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.submit(`AUTO_INVALID_${Date.now()}_${testInfo.workerIndex}`, env.adminPassword);
  await loginPage.expectLoginFailure();
});

test('[TC_DDBD_QTHT_DN_01_05] Tài khoản đúng và mật khẩu sai @regression @security', async ({ page }) => {
  test.skip(
    !env.runSecurity || !env.lockoutTestUsername || !env.lockoutTestPassword,
    'Chỉ thử mật khẩu sai với LOCKOUT_TEST_USERNAME riêng và RUN_SECURITY=true.',
  );
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.submit(env.lockoutTestUsername, `${env.lockoutTestPassword}_INVALID_ONCE`);
  await loginPage.expectLoginFailure();
});

test('[TC_DDBD_QTHT_DN_01_06] Tài khoản sai và mật khẩu sai @regression', async ({ page }, testInfo) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.submit(`AUTO_INVALID_${Date.now()}_${testInfo.workerIndex}`, 'Invalid_Login_Once');
  await loginPage.expectLoginFailure();
});

test('[TC_DDBD_QTHT_DN_01_07] Bỏ trống dữ liệu đăng nhập @regression', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.submitEmpty();
  await expect(loginPage.alert).toHaveText('Vui lòng nhập tên đăng nhập và mật khẩu');
  await expect(page).toHaveURL(/\/auth\/oauth\/login\?/);
});
