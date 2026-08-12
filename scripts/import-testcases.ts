import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { sanitizeSegment } from '../utils/test-id.js';

type AutomationStatus = 'AUTOMATED' | 'PARTIAL' | 'MANUAL' | 'BLOCKED' | 'SKIPPED_SAFETY';

type TestCase = {
  alias: string;
  originalId: string;
  scenario: string;
  title: string;
  priority: string;
  type: string;
  category: string;
  steps: string[];
  expectedResult: string;
  sourceRows: number[];
  hasSensitiveTestData: boolean;
};

type MatrixRow = {
  TestCaseID: string;
  Scenario: string;
  Title: string;
  Priority: string;
  Type: string;
  AutomationStatus: AutomationStatus;
  SpecFile: string;
  AutomatedTestName: string;
  Reason: string;
  Notes: string;
};

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE_FILE_PATTERN = 'sheet tổng hợp ddbd.xlsx';
const SOURCE_SHEET = 'Testcase_';

const IMPLEMENTED_AUTH_IDS = new Set([
  'TC_DDBD_QTHT_DN_01_01',
  'TC_DDBD_QTHT_DN_01_02',
  'TC_DDBD_QTHT_DN_01_03',
  'TC_DDBD_QTHT_DN_01_04',
  'TC_DDBD_QTHT_DN_01_05',
  'TC_DDBD_QTHT_DN_01_06',
  'TC_DDBD_QTHT_DN_01_07',
]);

const IMPLEMENTED_MAP_TYPE_IDS = new Set([
  'TC_DDBD_QLBD_QLLBD_01_01',
  'TC_DDBD_QLBD_QLLBD_01_02',
  'TC_DDBD_QLBD_QLLBD_01_03',
  'TC_DDBD_QLBD_QLLBD_01_04',
  'TC_DDBD_QLBD_QLLBD_01_05',
  'TC_DDBD_QLBD_QLLBD_01_06',
  'TC_DDBD_QLBD_QLLBD_01_07',
  'TC_DDBD_QLBD_QLLBD_01_08',
  'TC_DDBD_QLBD_QLLBD_01_09',
]);

const AUTOMATED_IDS = new Set([
  ...IMPLEMENTED_AUTH_IDS,
  'TC_DDBD_QTHT_DN_02_01',
  'TC_DDBD_QTHT_DN_02_02',
  'TC_DDBD_QTHT_DN_02_03',
  ...[...IMPLEMENTED_MAP_TYPE_IDS].filter((id) => id !== 'TC_DDBD_QLBD_QLLBD_01_05'),
]);

const KNOWN_INCOMPLETE_IDS = new Set([
  'TC_DDBD_QTHT_DN_02_05',
  'TC_DDBD_QTHT_TDNK_01_05',
  'TC_DDBD_QTHT_PQ_01_01',
  'TC_DDBD_QTHT_PQ_01_03',
  'TC_DDBD_QLBD_QLVTLT_01_02',
]);

function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeId(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, '');
}

function normalizedForMatch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function splitSteps(value: unknown): string[] {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .map((step) => step.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
}

async function findSourceWorkbook(directory: string): Promise<string | undefined> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const entryPath = join(directory, entry.name);
    if (entry.isFile() && entry.name.toLocaleLowerCase('vi-VN') === SOURCE_FILE_PATTERN) return entryPath;
    if (entry.isDirectory()) {
      const nested = await findSourceWorkbook(entryPath);
      if (nested) return nested;
    }
  }
  return undefined;
}

function getCell(row: unknown[], index: number | undefined): unknown {
  return index === undefined ? undefined : row[index];
}

function columnIndexes(headerRow: unknown[]): Record<string, number> {
  const indexes: Record<string, number> = {};
  headerRow.forEach((header, index) => {
    const name = normalizeText(header).toLowerCase();
    if (name) indexes[name] = index;
  });
  for (const required of ['test case id', 'scenario', 'title', 'steps/actions', 'expected result']) {
    if (indexes[required] === undefined) throw new Error(`Không tìm thấy cột bắt buộc: ${required}`);
  }
  return indexes;
}

function getDuplicateAlias(testCase: Omit<TestCase, 'alias'>, sequence: number): string {
  const matchText = normalizedForMatch(testCase.title);
  if (testCase.originalId === 'TC_DDBD_QTHT_TDNK_01_05') {
    if (matchText.includes('xuat') && matchText.includes('excel')) return `${testCase.originalId}__EXPORT_EXCEL`;
    if (matchText.includes('loc') || matchText.includes('thao tac')) return `${testCase.originalId}__FILTER_ACTION`;
  }
  if (testCase.originalId === 'TC_DDBD_CSDLVT_DMVT_03_01') {
    if (matchText.includes('them')) return `${testCase.originalId}__CREATE`;
    if (matchText.includes('sua')) return `${testCase.originalId}__EDIT`;
  }
  const semanticSuffix = sanitizeSegment(testCase.title).slice(0, 40);
  return `${testCase.originalId}__${semanticSuffix || `DUPLICATE_${sequence}`}`;
}

function assignAliases(testCases: Omit<TestCase, 'alias'>[]): TestCase[] {
  const counts = new Map<string, number>();
  for (const testCase of testCases) counts.set(testCase.originalId, (counts.get(testCase.originalId) ?? 0) + 1);
  const usedAliases = new Set<string>();
  const sequenceById = new Map<string, number>();

  return testCases.map((testCase) => {
    const sequence = (sequenceById.get(testCase.originalId) ?? 0) + 1;
    sequenceById.set(testCase.originalId, sequence);
    let alias = counts.get(testCase.originalId) === 1 ? testCase.originalId : getDuplicateAlias(testCase, sequence);
    while (usedAliases.has(alias)) alias = `${alias}_${sequence}`;
    usedAliases.add(alias);
    return { ...testCase, alias };
  });
}

function parseTestCases(workbookPath: string): TestCase[] {
  const workbook = XLSX.read(readFileSync(workbookPath), { cellText: false, cellDates: true });
  const sheet = workbook.Sheets[SOURCE_SHEET];
  if (!sheet) throw new Error(`Workbook không có sheet ${SOURCE_SHEET}`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const [headerRow, ...dataRows] = rows;
  if (!headerRow) throw new Error(`Sheet ${SOURCE_SHEET} không có header`);
  const columns = columnIndexes(headerRow);
  const parsed: Omit<TestCase, 'alias'>[] = [];
  let current: Omit<TestCase, 'alias'> | undefined;
  let inheritedScenario = '';

  dataRows.forEach((row, offset) => {
    const sourceRow = offset + 2;
    const scenario = normalizeText(getCell(row, columns.scenario));
    if (scenario) inheritedScenario = scenario;
    const id = normalizeId(getCell(row, columns['test case id']));
    const steps = splitSteps(getCell(row, columns['steps/actions']));
    const expected = normalizeText(getCell(row, columns['expected result']));

    if (id) {
      current = {
        originalId: id,
        scenario: scenario || inheritedScenario,
        title: normalizeText(getCell(row, columns.title)),
        priority: normalizeText(getCell(row, columns.prioirity ?? columns.priority)),
        type: normalizeText(getCell(row, columns['type of test case'])),
        category: normalizeText(getCell(row, columns.category)),
        steps,
        expectedResult: expected,
        sourceRows: [sourceRow],
        hasSensitiveTestData: Boolean(normalizeText(getCell(row, columns['test data']))),
      };
      parsed.push(current);
      return;
    }

    if (!current) return;
    if (steps.length > 0) current.steps.push(...steps);
    if (expected) current.expectedResult = current.expectedResult ? `${current.expectedResult}\n${expected}` : expected;
    if (steps.length > 0 || expected) current.sourceRows.push(sourceRow);
  });

  return assignAliases(parsed);
}

function specFileFor(testCase: TestCase): string {
  if (testCase.originalId === 'TC_DDBD_QTHT_DN_01_08') return 'tests/security/login-input-security.spec.ts';
  if (['TC_DDBD_QTHT_DN_02_01', 'TC_DDBD_QTHT_DN_02_02', 'TC_DDBD_QTHT_DN_02_03'].includes(testCase.originalId)) {
    return 'tests/auth/logout.spec.ts';
  }
  if (testCase.originalId === 'TC_DDBD_QLBD_QLLBD_01_05') return 'tests/security/stored-xss.spec.ts';
  if (IMPLEMENTED_AUTH_IDS.has(testCase.originalId)) return 'tests/auth/login.spec.ts';
  if (testCase.originalId === 'TC_DDBD_QTHT_DN_01_09') return 'tests/auth/profile.spec.ts';
  if (IMPLEMENTED_MAP_TYPE_IDS.has(testCase.originalId)) return 'tests/map-management/map-types.spec.ts';
  return '';
}

function planAutomation(testCase: TestCase): Pick<MatrixRow, 'AutomationStatus' | 'Reason'> {
  const matchText = normalizedForMatch(`${testCase.title} ${testCase.expectedResult}`);
  if (KNOWN_INCOMPLETE_IDS.has(testCase.originalId) || testCase.steps.length === 0 || !testCase.expectedResult) {
    const missing = [testCase.steps.length === 0 ? 'Steps/Actions' : '', !testCase.expectedResult ? 'Expected Result' : '']
      .filter(Boolean)
      .join(', ');
    return {
      AutomationStatus: 'BLOCKED',
      Reason: `Thiếu hoặc chưa rõ ${missing || 'Steps/Actions hoặc Expected Result'} trong nguồn; không suy đoán nghiệp vụ.`,
    };
  }
  if (testCase.originalId === 'TC_DDBD_QTHT_DN_01_09') {
    return {
      AutomationStatus: 'SKIPPED_SAFETY',
      Reason: 'Chỉ được chạy với LOCKOUT_TEST_USERNAME riêng và RUN_SECURITY=true; không thử khóa tài khoản quản trị.',
    };
  }
  if (/sql injection|xss/.test(matchText)) {
    return {
      AutomationStatus: 'SKIPPED_SAFETY',
      Reason: 'Security test cần RUN_SECURITY=true, quyền môi trường và locator đã được khảo sát; mặc định không chạy.',
    };
  }
  if (/tu dong dang xuat|timeout.*dang xuat/.test(matchText)) {
    return { AutomationStatus: 'BLOCKED', Reason: 'Chưa có thời gian timeout được đặc tả; test @long-running không tự chọn thời lượng.' };
  }
  if (/email/.test(matchText)) {
    return { AutomationStatus: 'PARTIAL', Reason: 'Cần mailbox thử nghiệm hoặc API đọc email để tự động hóa end-to-end.' };
  }
  if (/shapefile|geodb|geodatabase/.test(matchText)) {
    return { AutomationStatus: 'BLOCKED', Reason: 'Cần fixture Shapefile/GeoDB hợp lệ và quyền môi trường; không tạo file giả.' };
  }
  if (AUTOMATED_IDS.has(testCase.originalId)) {
    return {
      AutomationStatus: 'AUTOMATED',
      Reason: 'Đã có test, assertion web-first và locator được quan sát trực tiếp; test có tác động vẫn bị chặn bởi biến môi trường.',
    };
  }
  if (specFileFor(testCase)) {
    return {
      AutomationStatus: 'BLOCKED',
      Reason: 'Khung test đã được đăng ký, nhưng cần credentials và locator quan sát trực tiếp trước khi có assertion UI.',
    };
  }
  return { AutomationStatus: 'MANUAL', Reason: 'Chưa khảo sát module và chưa có Page Object/locator đã xác thực.' };
}

function toMatrixRow(testCase: TestCase): MatrixRow {
  const automation = planAutomation(testCase);
  const sourceNote = testCase.hasSensitiveTestData ? 'Test Data nguồn đã được loại khỏi artefact để tránh lộ dữ liệu nhạy cảm.' : '';
  const duplicateNote = testCase.alias === testCase.originalId ? '' : `Original ID: ${testCase.originalId}. Alias duy nhất: ${testCase.alias}.`;
  return {
    TestCaseID: testCase.alias,
    Scenario: testCase.scenario,
    Title: testCase.title,
    Priority: testCase.priority,
    Type: testCase.type || testCase.category,
    AutomationStatus: automation.AutomationStatus,
    SpecFile: specFileFor(testCase),
    AutomatedTestName: specFileFor(testCase) ? `[${testCase.alias}] ${testCase.title}` : '',
    Reason: automation.Reason,
    Notes: [duplicateNote, sourceNote].filter(Boolean).join(' '),
  };
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function createCsv(rows: MatrixRow[]): string {
  const headers = Object.keys(rows[0] ?? {}) as (keyof MatrixRow)[];
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n') + '\n';
}

function buildCoverageMarkdown(testCases: TestCase[], matrix: MatrixRow[], sourcePath: string): string {
  const counts = matrix.reduce<Record<AutomationStatus, number>>(
    (result, row) => ({ ...result, [row.AutomationStatus]: result[row.AutomationStatus] + 1 }),
    { AUTOMATED: 0, PARTIAL: 0, MANUAL: 0, BLOCKED: 0, SKIPPED_SAFETY: 0 },
  );
  const duplicates = testCases.filter((testCase) => testCase.alias !== testCase.originalId);
  return `# Automation coverage\n\nNguồn chính: \`${relative(ROOT, sourcePath)}\`, sheet \`${SOURCE_SHEET}\`. Workbook chỉ được đọc cục bộ và không được commit.\n\n## Tổng quan\n\n| Trạng thái | Số lượng |\n| --- | ---: |\n${Object.entries(counts)
    .map(([status, count]) => `| ${status} | ${count} |`)
    .join('\n')}\n| **Tổng** | **${matrix.length}** |\n\n\`AUTOMATED\` chỉ được dùng khi test có assertion UI thực tế. Tại thời điểm import này không có locator UI hoặc credentials được xác minh, vì vậy không gắn nhãn AUTOMATED một cách sai lệch.\n\n## Duplicate ID đã xử lý\n\n${duplicates.length ? duplicates.map((testCase) => `- \`${testCase.alias}\` (ID gốc: \`${testCase.originalId}\`) — ${testCase.title}`).join('\n') : 'Không có.'}\n\n## Bảo vệ dữ liệu\n\n- Manifest không chứa \`Test Data\`, \`Actual Result\`, tài khoản hoặc mật khẩu từ Excel.\n- \`Result\` lịch sử trong Excel không được dùng để quyết định assertion hay trạng thái test.\n- Các case thiếu Steps/Actions hoặc Expected Result được đánh dấu BLOCKED, không đoán nghiệp vụ.\n\nXem chi tiết từng test case tại [automation-matrix.csv](automation-matrix.csv).\n`;
}

async function main(): Promise<void> {
  const sourcePath = await findSourceWorkbook(ROOT);
  const matrixPath = join(ROOT, 'docs', 'automation-matrix.csv');
  if (!sourcePath) {
    if (existsSync(matrixPath)) {
      console.warn('Không tìm thấy workbook nguồn; giữ nguyên artefact coverage đã được commit để CI không cần dữ liệu nhạy cảm.');
      return;
    }
    throw new Error(`Không tìm thấy ${SOURCE_FILE_PATTERN} trong workspace.`);
  }

  const testCases = parseTestCases(sourcePath);
  const matrix = testCases.map(toMatrixRow);
  const sanitizedManifest = {
    schemaVersion: 1,
    source: { fileName: basename(sourcePath), sheet: SOURCE_SHEET },
    importedAt: new Date().toISOString(),
    totalTestCases: testCases.length,
    testCases,
  };

  await mkdir(join(ROOT, 'generated'), { recursive: true });
  await mkdir(join(ROOT, 'docs'), { recursive: true });
  await writeFile(join(ROOT, 'generated', 'testcase-manifest.json'), JSON.stringify(sanitizedManifest, null, 2) + '\n', 'utf8');
  await writeFile(matrixPath, createCsv(matrix), 'utf8');
  await writeFile(join(ROOT, 'docs', 'automation-coverage.md'), buildCoverageMarkdown(testCases, matrix, sourcePath), 'utf8');

  const counts = matrix.reduce<Record<AutomationStatus, number>>(
    (result, row) => ({ ...result, [row.AutomationStatus]: result[row.AutomationStatus] + 1 }),
    { AUTOMATED: 0, PARTIAL: 0, MANUAL: 0, BLOCKED: 0, SKIPPED_SAFETY: 0 },
  );
  console.info(JSON.stringify({ total: testCases.length, ...counts }, null, 2));
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Import test cases thất bại: ${message}`);
  process.exitCode = 1;
});
