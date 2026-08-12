# Test strategy

## Phạm vi

Framework kiểm thử hệ thống tại `BASE_URL`, ưu tiên đăng nhập/đăng xuất và module Quản lý loại bản đồ. Coverage được lấy từ sheet `Testcase_`; assertion luôn xuất phát từ `Expected Result`, không từ `Actual Result` hay trạng thái Pass/Fail lịch sử.

## Ngoài phạm vi

Không brute force, enumerate dữ liệu, dump cơ sở dữ liệu, RCE, DoS, upload mã độc, hoặc sửa/xóa dữ liệu không do test tạo. Integration email không được xem là end-to-end nếu không có mailbox/API thử nghiệm.

## Nhóm test

- `@smoke`: đường đi đọc dữ liệu ít tác động, chạy khi có quyền truy cập.
- `@regression`: kiểm thử chức năng/UI đã được xác nhận locator.
- `@destructive`: tạo/sửa/xóa dữ liệu riêng, chỉ khi `RUN_DESTRUCTIVE=true`.
- `@security`: SQLi/XSS vô hại, chỉ một lần thử, chỉ khi `RUN_SECURITY=true`.
- `@long-running`: timeout đăng xuất, chỉ khi `RUN_LONG_RUNNING=true` và timeout được đặc tả.

## Locator và Page Object

Chỉ thêm Page Object sau khi quan sát DOM thực tế. Ưu tiên `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, `getByTestId`, rồi CSS ổn định. Không dùng XPath tuyệt đối, `nth-child` hoặc class sinh ngẫu nhiên.

## Test data và cleanup

CRUD tạo dữ liệu với `AUTO_<module>_<timestamp>_<workerIndex>`. Test chỉ sửa/xóa dữ liệu do fixture hiện tại tạo và đăng ký cleanup chạy theo thứ tự ngược trong teardown, kể cả khi assertion thất bại. CRUD phải chạy độc lập hoặc với một worker.

## Known bug

Khi hành vi hiện tại trái `Expected Result`, assertion được giữ nguyên và lỗi được ghi nhận như known bug. Không đổi assertion để hợp thức hóa Pass lịch sử.

## Báo cáo kết quả

Sau mỗi lần chạy, Playwright giữ HTML report chuẩn và reporter của project sinh thêm HTML, CSV, JSON, Markdown trong `test-results/`. Báo cáo tổng hợp theo Test Case ID, project/browser, spec, trạng thái, duration, retry, annotation và lỗi. Test bị bỏ qua có chủ đích được ghi là `SKIPPED`; test không được thực thi do setup/dependency thất bại được ghi là `NOT_RUN`, không được tính nhầm thành Pass. Giá trị tài khoản và mật khẩu từ môi trường được che trước khi ghi lỗi ra báo cáo.

## Rủi ro môi trường

Website có thể là hệ thống nội bộ/VPN và có dữ liệu thật. Không chạy E2E qua GitHub-hosted runner mặc định; cần self-hosted runner trong mạng được cấp quyền. Thiếu credentials, quyền module, fixture hợp lệ hoặc DOM khảo sát là blocker hợp lệ, không phải lý do để suy đoán locator.
