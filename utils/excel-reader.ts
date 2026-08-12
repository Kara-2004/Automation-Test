import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';

export function readWorkbookHeaders(filePath: string): string[] {
  const workbook = XLSX.read(readFileSync(filePath), { cellText: false, cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, blankrows: false });
  return (rows[0] ?? []).map((value) => String(value).trim()).filter(Boolean);
}
