import { env } from '../utils/env.js';

export const users = {
  admin: { username: env.adminUsername, password: env.adminPassword },
  standard: { username: env.standardUsername, password: env.standardPassword },
  lockout: { username: env.lockoutTestUsername, password: env.lockoutTestPassword },
};
