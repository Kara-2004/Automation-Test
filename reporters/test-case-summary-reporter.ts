import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from '@playwright/test/reporter';

type ReportStatus =
  | 'PASS'
  | 'FAIL'
  | 'FLAKY'
  | 'SKIPPED'
  | 'TIMED_OUT'
  | 'INTERRUPTED'
  | 'NOT_RUN';

interface ReporterOptions {
  outputDir?: string;
  filePrefix?: string;
}

interface AttemptSummary {
  attempt: number;
  status: TestResult['status'];
  durationMs: number;
  startedAt: string;
  errors: string[];
  attachments: Array<{
    name: string;
    contentType: string;
    path?: string;
  }>;
}

interface TestSummary {
  testCaseId: string;
  status: ReportStatus;
  project: string;
  specFile: string;
  line: number;
  testName: string;
  tags: string[];
  expectedStatus: TestCase['expectedStatus'];
  outcome: ReturnType<TestCase['outcome']>;
  durationMs: number;
  retries: number;
  annotations: string[];
  error: string;
  attempts: AttemptSummary[];
}

interface RunSummary {
  generatedAt: string;
  startedAt: string;
  durationMs: number;
  playwrightStatus: FullResult['status'];
  total: number;
  counts: Record<ReportStatus, number>;
  tests: TestSummary[];
}

const REPORT_STATUSES: ReportStatus[] = [
  'PASS',
  'FAIL',
  'FLAKY',
  'SKIPPED',
  'TIMED_OUT',
  'INTERRUPTED',
  'NOT_RUN',
];

export default class TestCaseSummaryReporter implements Reporter {
  private readonly outputDir: string;
  private readonly filePrefix: string;
  private config?: FullConfig;
  private suite?: Suite;

  constructor(options: ReporterOptions = {}) {
    this.outputDir = options.outputDir ?? 'test-results';
    this.filePrefix = options.filePrefix ?? 'test-summary';
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
  }

  async onEnd(result: FullResult): Promise<void> {
    const outputPath = path.resolve(process.cwd(), this.outputDir);
    const summary = this.createRunSummary(result);

    await mkdir(outputPath, { recursive: true });
    await Promise.all([
      writeFile(
        path.join(outputPath, `${this.filePrefix}.json`),
        `${JSON.stringify(summary, null, 2)}\n`,
        'utf8',
      ),
      writeFile(
        path.join(outputPath, `${this.filePrefix}.csv`),
        this.createCsv(summary),
        'utf8',
      ),
      writeFile(
        path.join(outputPath, `${this.filePrefix}.md`),
        this.createMarkdown(summary),
        'utf8',
      ),
      writeFile(
        path.join(outputPath, `${this.filePrefix}.html`),
        this.createHtml(summary),
        'utf8',
      ),
    ]);

    console.log(
      `\nBáo cáo test: ${path.join(outputPath, `${this.filePrefix}.html`)}`,
    );
  }

  printsToStdio(): boolean {
    return false;
  }

  private createRunSummary(result: FullResult): RunSummary {
    const tests = (this.suite?.allTests() ?? [])
      .map((test) => this.createTestSummary(test))
      .sort(
        (left, right) =>
          left.testCaseId.localeCompare(right.testCaseId) ||
          left.project.localeCompare(right.project) ||
          left.testName.localeCompare(right.testName),
      );

    const counts = Object.fromEntries(
      REPORT_STATUSES.map((status) => [
        status,
        tests.filter((test) => test.status === status).length,
      ]),
    ) as Record<ReportStatus, number>;

    return {
      generatedAt: new Date().toISOString(),
      startedAt: result.startTime.toISOString(),
      durationMs: result.duration,
      playwrightStatus: result.status,
      total: tests.length,
      counts,
      tests,
    };
  }

  private createTestSummary(test: TestCase): TestSummary {
    const attempts = test.results.map((result) => this.createAttemptSummary(result));
    const finalResult = test.results.at(-1);
    const project = test.parent.project()?.name ?? 'unknown';
    const specFile = this.config
      ? path.relative(this.config.rootDir, test.location.file)
      : test.location.file;

    return {
      testCaseId: this.extractTestCaseId(test.title),
      status: this.resolveStatus(test),
      project: this.redact(project),
      specFile: this.redact(specFile.replaceAll(path.sep, '/')),
      line: test.location.line,
      testName: this.redact(test.title),
      tags: test.tags.map((tag) => this.redact(tag)),
      expectedStatus: test.expectedStatus,
      outcome: test.outcome(),
      durationMs: attempts.reduce((total, attempt) => total + attempt.durationMs, 0),
      retries: finalResult?.retry ?? 0,
      annotations: test.annotations.map(({ type, description }) =>
        this.redact(description ? `${type}: ${description}` : type),
      ),
      error: this.formatErrors(finalResult?.errors ?? []),
      attempts,
    };
  }

  private createAttemptSummary(result: TestResult): AttemptSummary {
    return {
      attempt: result.retry + 1,
      status: result.status,
      durationMs: result.duration,
      startedAt: result.startTime.toISOString(),
      errors: result.errors.map((error) => this.formatError(error)),
      attachments: result.attachments.map(({ name, contentType, path: filePath }) => ({
        name: this.redact(name),
        contentType,
        path: filePath ? this.redact(path.relative(process.cwd(), filePath)) : undefined,
      })),
    };
  }

  private resolveStatus(test: TestCase): ReportStatus {
    const finalResult = test.results.at(-1);
    if (!finalResult) {
      return 'NOT_RUN';
    }
    if (test.outcome() === 'flaky') {
      return 'FLAKY';
    }

    switch (finalResult.status) {
      case 'passed':
        return 'PASS';
      case 'failed':
        return 'FAIL';
      case 'timedOut':
        return 'TIMED_OUT';
      case 'interrupted':
        return 'INTERRUPTED';
      case 'skipped':
        return test.expectedStatus === 'skipped' ||
          test.annotations.some(({ type }) => type === 'skip' || type === 'fixme') ||
          finalResult.workerIndex !== -1
          ? 'SKIPPED'
          : 'NOT_RUN';
    }
  }

  private extractTestCaseId(title: string): string {
    const match = title.match(/\[([^\]]+)\]/);
    return match?.[1]?.trim() || 'N/A';
  }

  private formatErrors(errors: TestError[]): string {
    return errors.map((error) => this.formatError(error)).filter(Boolean).join('\n\n');
  }

  private formatError(error: TestError): string {
    return this.redact(error.stack ?? error.message ?? error.value ?? 'Unknown error');
  }

  private redact(value: string): string {
    const sensitiveValues = [
      process.env.ADMIN_USERNAME,
      process.env.ADMIN_PASSWORD,
      process.env.STANDARD_USERNAME,
      process.env.STANDARD_PASSWORD,
      process.env.LOCKOUT_TEST_USERNAME,
      process.env.LOCKOUT_TEST_PASSWORD,
    ].filter((secret): secret is string => Boolean(secret && secret.length >= 3));

    return sensitiveValues.reduce(
      (redacted, secret) => redacted.split(secret).join('[REDACTED]'),
      value,
    );
  }

  private createCsv(summary: RunSummary): string {
    const headers = [
      'TestCaseID',
      'Status',
      'Project',
      'SpecFile',
      'Line',
      'TestName',
      'Tags',
      'ExpectedStatus',
      'Outcome',
      'DurationMs',
      'Retries',
      'Annotations',
      'Error',
    ];
    const rows = summary.tests.map((test) => [
      test.testCaseId,
      test.status,
      test.project,
      test.specFile,
      test.line,
      test.testName,
      test.tags.join(' '),
      test.expectedStatus,
      test.outcome,
      test.durationMs,
      test.retries,
      test.annotations.join(' | '),
      test.error,
    ]);

    return `\uFEFF${[headers, ...rows]
      .map((row) => row.map((value) => this.escapeCsv(value)).join(','))
      .join('\r\n')}\r\n`;
  }

  private escapeCsv(value: string | number): string {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  private createMarkdown(summary: RunSummary): string {
    const rows = summary.tests.map(
      (test) =>
        `| ${this.escapeMarkdown(test.testCaseId)} | ${test.status} | ${this.escapeMarkdown(test.project)} | ${this.escapeMarkdown(test.specFile)}:${test.line} | ${this.escapeMarkdown(test.testName)} | ${test.durationMs} |`,
    );

    return [
      '# Báo cáo kết quả Playwright',
      '',
      `- Bắt đầu: ${summary.startedAt}`,
      `- Thời gian chạy: ${summary.durationMs} ms`,
      `- Kết quả Playwright: ${summary.playwrightStatus}`,
      `- Tổng số test: ${summary.total}`,
      ...REPORT_STATUSES.map((status) => `- ${status}: ${summary.counts[status]}`),
      '',
      '| Test Case ID | Trạng thái | Project | Spec | Tên test | Thời gian (ms) |',
      '| --- | --- | --- | --- | --- | ---: |',
      ...rows,
      '',
      '> Chi tiết lỗi, retry và attachment nằm trong file JSON/HTML cùng thư mục.',
      '',
    ].join('\n');
  }

  private escapeMarkdown(value: string): string {
    return value.replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ');
  }

  private createHtml(summary: RunSummary): string {
    const summaryCards = REPORT_STATUSES.map(
      (status) =>
        `<div class="card ${status.toLowerCase()}"><span>${status}</span><strong>${summary.counts[status]}</strong></div>`,
    ).join('');
    const rows = summary.tests
      .map((test) => {
        const error = test.error
          ? `<details><summary>Xem lỗi</summary><pre>${this.escapeHtml(test.error)}</pre></details>`
          : '';
        const annotations = test.annotations.length
          ? `<div class="annotations">${this.escapeHtml(test.annotations.join(' | '))}</div>`
          : '';

        return `<tr data-status="${test.status}">
          <td>${this.escapeHtml(test.testCaseId)}</td>
          <td><span class="badge ${test.status.toLowerCase()}">${test.status}</span></td>
          <td>${this.escapeHtml(test.project)}</td>
          <td>${this.escapeHtml(test.specFile)}:${test.line}</td>
          <td>${this.escapeHtml(test.testName)}${annotations}${error}</td>
          <td class="number">${test.durationMs}</td>
          <td class="number">${test.retries}</td>
        </tr>`;
      })
      .join('\n');

    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Báo cáo kết quả Playwright</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Segoe UI, Arial, sans-serif; }
    body { margin: 0; background: #f4f7fb; color: #172033; }
    main { max-width: 1500px; margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .meta { color: #526079; margin-bottom: 22px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card { background: white; border: 1px solid #dce3ee; border-left: 5px solid #7a879c; border-radius: 8px; padding: 12px 14px; }
    .card span { display: block; color: #526079; font-size: 12px; }
    .card strong { display: block; margin-top: 4px; font-size: 24px; }
    .card.pass { border-left-color: #198754; }
    .card.fail, .card.timed_out, .card.interrupted { border-left-color: #dc3545; }
    .card.flaky { border-left-color: #fd7e14; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 12px; }
    input, select { background: white; border: 1px solid #b8c4d6; border-radius: 6px; padding: 9px 11px; font: inherit; }
    input { flex: 1; min-width: 220px; }
    .table-wrap { overflow: auto; background: white; border: 1px solid #dce3ee; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border-bottom: 1px solid #e7ebf1; padding: 10px; text-align: left; vertical-align: top; }
    th { position: sticky; top: 0; background: #eef2f8; white-space: nowrap; }
    tr:hover td { background: #f8faff; }
    .number { text-align: right; }
    .badge { border-radius: 999px; color: white; display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 8px; }
    .badge.pass { background: #198754; }
    .badge.fail, .badge.timed_out, .badge.interrupted { background: #dc3545; }
    .badge.flaky { background: #fd7e14; }
    .badge.skipped, .badge.not_run { background: #6c757d; }
    .annotations { color: #6c4f00; margin-top: 5px; }
    details { margin-top: 6px; }
    summary { color: #b42318; cursor: pointer; font-weight: 600; }
    pre { background: #fff4f2; border: 1px solid #ffd1cc; border-radius: 6px; max-width: 800px; overflow: auto; padding: 10px; white-space: pre-wrap; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <main>
    <h1>Báo cáo kết quả Playwright</h1>
    <div class="meta">Bắt đầu: ${this.escapeHtml(summary.startedAt)} · Thời gian: ${summary.durationMs} ms · Playwright: ${summary.playwrightStatus} · Tổng: ${summary.total}</div>
    <section class="cards">${summaryCards}</section>
    <div class="toolbar">
      <input id="search" type="search" placeholder="Tìm Test Case ID, tên test hoặc spec...">
      <select id="status">
        <option value="">Tất cả trạng thái</option>
        ${REPORT_STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('')}
      </select>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Test Case ID</th><th>Trạng thái</th><th>Project</th><th>Spec</th><th>Tên test / lỗi</th><th>ms</th><th>Retry</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </main>
  <script>
    const search = document.querySelector('#search');
    const status = document.querySelector('#status');
    const rows = [...document.querySelectorAll('tbody tr')];
    const applyFilters = () => {
      const term = search.value.trim().toLocaleLowerCase('vi');
      rows.forEach((row) => {
        const matchesText = !term || row.textContent.toLocaleLowerCase('vi').includes(term);
        const matchesStatus = !status.value || row.dataset.status === status.value;
        row.hidden = !(matchesText && matchesStatus);
      });
    };
    search.addEventListener('input', applyFilters);
    status.addEventListener('change', applyFilters);
  </script>
</body>
</html>
`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
