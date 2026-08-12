import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../utils/env.js';

export class LoginPage {
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;
  readonly clientAccessMessage: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'ĐĂNG NHẬP SSO', exact: true });
    this.usernameInput = page.getByLabel('Tên đăng nhập', { exact: true });
    this.passwordInput = page.locator('input[type="password"][placeholder="Nhập mật khẩu"]');
    this.submitButton = page.getByRole('button', { name: /Đăng nhập/ });
    this.alert = page.getByRole('alert');
    this.clientAccessMessage = page.getByText(/đang yêu cầu quyền truy cập/);
  }

  async open(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    const loginButton = this.page.getByRole('button', { name: 'Đăng nhập', exact: true });
    await expect(loginButton).toBeVisible();
    await Promise.all([
      this.page.waitForURL(/\/auth\/oauth\/login\?/, { waitUntil: 'commit' }),
      loginButton.click({ noWaitAfter: true }),
    ]);
    try {
      await this.expectFormVisible(7_000);
    } catch (error) {
      if (!/\/auth\/oauth\/login\?/.test(this.page.url())) {
        throw error;
      }
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.expectFormVisible(15_000);
    }
  }

  async expectFormVisible(timeout = 20_000): Promise<void> {
    await this.page.locator('[ng-version]').waitFor({ state: 'attached', timeout });
    await expect(this.clientAccessMessage).toBeVisible();
    await expect(this.heading).toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.usernameInput).toBeEnabled();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.passwordInput).toBeEnabled();
    await expect(this.submitButton).toBeVisible();
    await expect(this.submitButton).toBeEnabled();
  }

  async submit(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.submitButton.click();
  }

  async submitEmpty(): Promise<void> {
    const readinessProbe = 'AUTO_FORM_READY';
    await expect(async () => {
      await this.usernameInput.fill(readinessProbe);
      const modelValue = await this.usernameInput.getAttribute('ng-reflect-model');
      expect(
        modelValue === readinessProbe,
        'Angular chưa sẵn sàng nhận sự kiện submit.',
      ).toBe(true);
    }).toPass({ timeout: 10_000 });

    await expect(async () => {
      await this.usernameInput.fill('');
      const modelValue = await this.usernameInput.getAttribute('ng-reflect-model');
      expect(
        modelValue === '',
        'Angular chưa đồng bộ trạng thái tên đăng nhập trống.',
      ).toBe(true);
    }).toPass({ timeout: 10_000 });

    await this.submitButton.click();
  }

  async login(username: string, password: string): Promise<void> {
    const homeUrl = new URL('/', env.baseUrl).href;
    await this.fillCredentials(username, password);
    await Promise.all([
      this.page.waitForURL(homeUrl, { waitUntil: 'commit' }),
      this.submitButton.click({ noWaitAfter: true }),
    ]);
    await expect(this.page).toHaveURL(homeUrl);
  }

  async expectLoginFailure(): Promise<void> {
    await expect(this.alert).toHaveText('Đăng nhập thất bại');
    await expect(this.page).toHaveURL(/\/auth\/oauth\/login\?/);
    await expect(this.heading).toBeVisible();
  }

  private async fillCredentials(username: string, password: string): Promise<void> {
    await expect(async () => {
      await this.usernameInput.fill(username);
      const modelValue = await this.usernameInput.getAttribute('ng-reflect-model');
      expect(
        modelValue === username,
        'Angular chưa đồng bộ trường tên đăng nhập.',
      ).toBe(true);
    }).toPass({ timeout: 10_000 });

    const passwordComponent = this.page.locator('p-password[name="password"]');
    await expect(async () => {
      await this.passwordInput.fill(password);
      const modelValue = await passwordComponent.getAttribute('ng-reflect-model');
      expect(
        modelValue === password,
        'Angular chưa đồng bộ trường mật khẩu.',
      ).toBe(true);
    }).toPass({ timeout: 10_000 });

    await expect
      .poll(async () => {
        const usernameReady = (await this.usernameInput.inputValue()) === username;
        const passwordReady = (await this.passwordInput.inputValue()) === password;
        return usernameReady && passwordReady;
      })
      .toBe(true);
  }
}
