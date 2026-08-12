export function buildAutomationName(testCaseId: string, title: string): string {
  return `[${testCaseId}] ${title}`.replace(/\s+/g, ' ').trim();
}

export function sanitizeSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
