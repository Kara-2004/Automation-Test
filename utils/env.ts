import 'dotenv/config';

function booleanFromEnv(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value.trim() === '') return defaultValue;
  return value.trim().toLowerCase() === 'true';
}

function numberFromEnv(value: string | undefined, defaultValue = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export const env = {
  baseUrl: process.env.BASE_URL?.trim() || 'http://ddbd.tphcm.com/',
  playwrightProxy: process.env.PLAYWRIGHT_PROXY?.trim() || '',
  adminUsername: process.env.ADMIN_USERNAME?.trim() || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  standardUsername: process.env.STANDARD_USERNAME?.trim() || '',
  standardPassword: process.env.STANDARD_PASSWORD || '',
  lockoutTestUsername: process.env.LOCKOUT_TEST_USERNAME?.trim() || '',
  lockoutTestPassword: process.env.LOCKOUT_TEST_PASSWORD || '',
  runDestructive: booleanFromEnv(process.env.RUN_DESTRUCTIVE),
  runSecurity: booleanFromEnv(process.env.RUN_SECURITY),
  runLongRunning: booleanFromEnv(process.env.RUN_LONG_RUNNING),
  headless: booleanFromEnv(process.env.HEADLESS, true),
  slowMo: numberFromEnv(process.env.SLOW_MO),
};

export function hasAdminCredentials(): boolean {
  return Boolean(env.adminUsername && env.adminPassword);
}

export function hasStandardCredentials(): boolean {
  return Boolean(env.standardUsername && env.standardPassword);
}
