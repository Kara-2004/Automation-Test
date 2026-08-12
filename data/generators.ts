import { sanitizeSegment } from '../utils/test-id.js';

export function createOwnedName(module: string, workerIndex: number): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `AUTO_${sanitizeSegment(module)}_${timestamp}_${workerIndex}`;
}
