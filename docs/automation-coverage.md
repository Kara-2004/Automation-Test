# Automation coverage

Nguồn chính: `Sheet Tổng Hợp DDBD.xlsx`, sheet `Testcase_`. Workbook chỉ được đọc cục bộ và không được commit.

## Tổng quan

| Trạng thái | Số lượng |
| --- | ---: |
| AUTOMATED | 0 |
| PARTIAL | 2 |
| MANUAL | 87 |
| BLOCKED | 26 |
| SKIPPED_SAFETY | 3 |
| **Tổng** | **118** |

`AUTOMATED` chỉ được dùng khi test có assertion UI thực tế. Tại thời điểm import này không có locator UI hoặc credentials được xác minh, vì vậy không gắn nhãn AUTOMATED một cách sai lệch.

## Duplicate ID đã xử lý

- `TC_DDBD_QTHT_TDNK_01_05__EXPORT_EXCEL` (ID gốc: `TC_DDBD_QTHT_TDNK_01_05`) — Xuất nhật ký hệ thống ra Excel
- `TC_DDBD_QTHT_TDNK_01_05__FILTER_ACTION` (ID gốc: `TC_DDBD_QTHT_TDNK_01_05`) — Duyệt danh sách nhật ký hệ thống theo từng loại thao tác (thêm, sửa, xóa ..)
- `TC_DDBD_CSDLVT_DMVT_03_01__CREATE` (ID gốc: `TC_DDBD_CSDLVT_DMVT_03_01`) — Kiểm tra thêm mới danh mục bộ cảm biến (cả 2 trường hợp)
- `TC_DDBD_CSDLVT_DMVT_03_01__EDIT` (ID gốc: `TC_DDBD_CSDLVT_DMVT_03_01`) — Kiểm tra sửa danh mục bộ cảm biến (cả 2 trường hợp)

## Bảo vệ dữ liệu

- Manifest không chứa `Test Data`, `Actual Result`, tài khoản hoặc mật khẩu từ Excel.
- `Result` lịch sử trong Excel không được dùng để quyết định assertion hay trạng thái test.
- Các case thiếu Steps/Actions hoặc Expected Result được đánh dấu BLOCKED, không đoán nghiệp vụ.

Xem chi tiết từng test case tại [automation-matrix.csv](automation-matrix.csv).
