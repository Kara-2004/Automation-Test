import { test as base } from './test-data.fixture.js';
import { env } from '../utils/env.js';

type Cleanup = () => Promise<void>;
type DestructiveFixtures = {
  destructiveEnabled: boolean;
  registerCleanup: (cleanup: Cleanup) => void;
};

export const test = base.extend<DestructiveFixtures>({
  destructiveEnabled: async ({ page: _page }, use) => use(env.runDestructive),
  registerCleanup: async ({ page: _page }, use) => {
    const cleanups: Cleanup[] = [];
    try {
      await use((cleanup) => cleanups.push(cleanup));
    } finally {
      for (const cleanup of cleanups.reverse()) await cleanup();
    }
  },
});

export { expect } from './test-data.fixture.js';
