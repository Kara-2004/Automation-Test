import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base } from '@playwright/test';

export const authStatePaths = {
  admin: resolve('tests/.auth/admin.json'),
  standard: resolve('tests/.auth/standard.json'),
} as const;

export function hasAuthState(role: keyof typeof authStatePaths): boolean {
  return existsSync(authStatePaths[role]);
}

export const test = base;
export { expect } from '@playwright/test';
