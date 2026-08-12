import { expect, type Download, type Page } from '@playwright/test';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function expectExcelDownload(page: Page, trigger: () => Promise<void>): Promise<Download> {
  const downloadPromise = page.waitForEvent('download');
  await trigger();
  const download = await downloadPromise;
  await expect.poll(() => download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/i);
  return download;
}

export async function assertDownloadedFileIsNotEmpty(download: Download, directory: string): Promise<string> {
  const filePath = join(directory, download.suggestedFilename());
  await download.saveAs(filePath);
  await expect.poll(async () => (await stat(filePath)).size).toBeGreaterThan(0);
  return filePath;
}
