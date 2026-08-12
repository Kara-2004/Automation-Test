import { test as base } from '@playwright/test';
import { createOwnedName } from '../data/generators.js';

type TestDataFixtures = {
  generatedName: (module: string) => string;
};

export const test = base.extend<TestDataFixtures>({
  generatedName: async ({ page: _page }, use, testInfo) => {
    await use((module) => createOwnedName(module, testInfo.workerIndex));
  },
});

export { expect } from '@playwright/test';
