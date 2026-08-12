import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test } from '@playwright/test';
import { authStatePaths } from '../../fixtures/auth.fixture.js';
import { LoginPage } from '../../pages/LoginPage.js';
import { env, hasAdminCredentials, hasStandardCredentials } from '../../utils/env.js';

test('setup admin storage state', async ({ page }) => {
  test.skip(!hasAdminCredentials(), 'ADMIN_USERNAME và ADMIN_PASSWORD chưa được cấu hình.');
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(env.adminUsername, env.adminPassword);
  await mkdir(dirname(authStatePaths.admin), { recursive: true });
  await page.context().storageState({ path: authStatePaths.admin });
});

test('setup standard storage state', async ({ page }) => {
  test.skip(!hasStandardCredentials(), 'STANDARD_USERNAME và STANDARD_PASSWORD chưa được cấu hình.');
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(env.standardUsername, env.standardPassword);
  await mkdir(dirname(authStatePaths.standard), { recursive: true });
  await page.context().storageState({ path: authStatePaths.standard });
});
