import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage.js';
import { env } from '../../utils/env.js';

test('[TC_DDBD_QTHT_DN_01_08] SQL Injection đăng nhập một lần thử vô hại @security', async ({ page }) => {
  test.skip(!env.runSecurity, 'Security test chỉ chạy khi RUN_SECURITY=true.');
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.submit(`' OR '1'='1`, 'Invalid_Login_Once');
  await loginPage.expectLoginFailure();
  await expect(page.locator('body')).not.toContainText(/SQLSTATE|stack trace|database error|exception/i);
  await expect(loginPage.heading).toBeVisible();
});
