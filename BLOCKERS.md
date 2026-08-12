# Điều kiện môi trường và blocker còn lại

## 1. Website chỉ truy cập được trong mạng công ty/VPN

Ngày 31/07/2026, Playwright đã truy cập SSO, tạo được storage state cho admin/standard và chạy thành công toàn bộ nhóm test an toàn trong mạng công ty.

Khi ở ngoài mạng công ty, `ddbd.tphcm.com` vẫn phân giải thành IP nội bộ `192.168.254.100` nhưng HTTP timeout. Đây là điều kiện môi trường, không phải lỗi website hoặc test.

Điều kiện chạy:

1. Kết nối máy Windows vào VPN/mạng nội bộ có quyền truy cập `192.168.254.100:80`; hoặc
2. Nếu tổ chức dùng proxy, lấy URL proxy hợp lệ từ quản trị mạng và điền `PLAYWRIGHT_PROXY` trong `.env`.

Xác nhận tuyến mạng trước khi chạy Playwright:

```powershell
curl.exe --max-time 20 --output NUL --silent --show-error `
  --write-out "HTTP=%{http_code} CONNECT=%{time_connect}s TOTAL=%{time_total}s`n" `
  http://ddbd.tphcm.com/
```

Chỉ chạy test khi `HTTP` khác `000`. Việc website mở được trong một trình duyệt dùng proxy/VPN riêng không bảo đảm Chromium do Playwright khởi chạy có cùng tuyến mạng.

## 2. Các điều kiện nghiệp vụ còn thiếu

- Chưa có tài khoản thử nghiệm riêng cho lockout (`LOCKOUT_TEST_USERNAME`/`LOCKOUT_TEST_PASSWORD`).
- Chưa có số lần đăng nhập sai được đặc tả và mailbox/API thử nghiệm để xác minh email khóa tài khoản.
- Chưa có thời gian timeout được đặc tả cho test tự động đăng xuất.
- Chưa có Shapefile/GeoDB hợp lệ cùng quyền môi trường tương ứng.

Các test liên quan tiếp tục giữ `BLOCKED`, `PARTIAL` hoặc `SKIPPED_SAFETY`; framework không tự đoán dữ liệu hay hành vi nghiệp vụ.
