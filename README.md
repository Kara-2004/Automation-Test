# DDBD Playwright Automation

Project portfolio QA Automation cho hệ thống DDBD tại `http://ddbd.tphcm.com/`. Framework dùng Playwright Test, TypeScript, Page Object Model theo locator đã quan sát, fixture, HTML report và artefact failure (screenshot/video/trace).

## Công nghệ và cấu trúc

- Node.js, TypeScript, Playwright Test, `xlsx`, ESLint và GitHub Actions.
- `tests/`: test theo module; auth, Quản lý loại bản đồ và security được ưu tiên.
- `pages/`: chỉ có Page Object đã quan sát. Không có locator đoán.
- `fixtures/`, `data/`, `utils/`: session storage, sinh dữ liệu `AUTO_*`, cleanup, download và cấu hình môi trường.
- `scripts/import-testcases.ts`: đọc sheet `Testcase_`, kế thừa Scenario, gom steps, xử lý duplicate ID và sinh coverage.
- `docs/`: matrix và strategy. Xem [coverage](docs/automation-coverage.md) và [blockers](BLOCKERS.md).

## Cài đặt

```bash
npm install
npx playwright install chromium
Copy-Item .env.example .env
```

Điền credentials được cấp vào `.env`; không commit file này. Workbook nguồn, `.env`, `tests/.auth/`, report và kết quả chạy đều đã được `.gitignore`.

Nếu website chỉ truy cập được qua proxy của tổ chức, điền `PLAYWRIGHT_PROXY` trong `.env`. Nếu dùng VPN/mạng nội bộ trực tiếp thì để biến này trống.

```bash
npm run import:testcases
npm run typecheck
npm run lint
npm run test:list
```

`generated/testcase-manifest.json` không chứa Test Data/Actual Result nhưng vẫn bị ignore để phòng thay đổi dữ liệu nguồn trong tương lai. Trên CI không có workbook nhạy cảm, import giữ lại các coverage artefact đã commit.

## Chạy test

```bash
npm run test:smoke
npm run test:regression
npm run test:crud       # cần RUN_DESTRUCTIVE=true
npm run test:security   # cần RUN_SECURITY=true
npm run test:long       # cần RUN_LONG_RUNNING=true
npm run report
```

Sau mỗi lần chạy, ngoài HTML report chuẩn ở `playwright-report/`, project tự sinh báo cáo tổng hợp trong `test-results/`:

- `test-summary.html`: dashboard có bộ lọc theo trạng thái và ô tìm kiếm Test Case ID.
- `test-summary.csv`: danh sách PASS/FAIL để lọc hoặc mở bằng Excel.
- `test-summary.json`: dữ liệu chi tiết từng attempt, retry, lỗi và attachment.
- `test-summary.md`: bảng kết quả rút gọn.

Báo cáo luôn liệt kê cả test bị skip hoặc không chạy do setup/dependency thất bại. Giá trị tài khoản và mật khẩu từ biến môi trường được che khỏi nội dung lỗi. Hai thư mục report nằm trong `.gitignore`; workflow E2E thủ công upload chúng thành GitHub Actions artifact khi job hoàn tất.

Framework dùng tối đa hai worker và chạy tuần tự các test nằm trong cùng spec. Cách này vẫn cho phép các spec đọc dữ liệu độc lập chạy song song, đồng thời tránh gửi nhiều luồng đăng nhập tới SSO nội bộ cùng lúc.

Login/logout dùng context sạch; các module đã xác minh có thể tái sử dụng `storageState` ở `tests/.auth/admin.json` và `standard.json`. Nếu auth setup thất bại, các test phụ thuộc được báo cáo `NOT_RUN`, không được tính nhầm thành Pass.

## Quy tắc an toàn

- Smoke mặc định chỉ đọc dữ liệu; không tác động dữ liệu người dùng.
- CRUD chỉ tạo dữ liệu riêng với prefix `AUTO_<module>_<timestamp>_<workerIndex>`, chỉ sửa/xóa bản ghi đó và cleanup trong fixture teardown.
- Lockout chỉ dùng `LOCKOUT_TEST_USERNAME` riêng; không bao giờ dùng tài khoản admin.
- SQLi/XSS chỉ dùng payload vô hại một lần; không brute force, scan, enumerate, dump hoặc khai thác hệ thống.
- Shapefile/GeoDB chỉ chạy với fixture thật và quyền phù hợp.

## Coverage và dữ liệu nguồn

`Testcase_` là nguồn chính, `Testcase` chỉ để tham chiếu. Import không dùng `Actual Result`/`Result` để viết assertion. Các case thiếu bước/kết quả mong đợi luôn BLOCKED. Matrix có ở [docs/automation-matrix.csv](docs/automation-matrix.csv).

## GitHub Actions

`quality-check.yml` chạy typecheck, lint, import và test list, không truy cập website. `e2e-manual.yml` chỉ chạy thủ công, nhận `BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `STANDARD_USERNAME`, `STANDARD_PASSWORD` từ GitHub Secrets và giữ destructive/security là `false`.

Nếu URL chỉ dùng được qua VPN/intranet, đổi runner E2E sang self-hosted runner trong mạng được cấp quyền. Không đưa credentials hoặc workbook lên GitHub.

Trước khi chạy E2E, có thể dùng `curl.exe http://ddbd.tphcm.com/` để xác nhận chính môi trường dòng lệnh có tuyến mạng tới website. Chi tiết điều kiện còn thiếu được cập nhật tại [BLOCKERS.md](BLOCKERS.md).
