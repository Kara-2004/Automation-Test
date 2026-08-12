import { test } from '@playwright/test';

test('[TC_DDBD_QTHT_DN_01_09] Khóa tài khoản sau số lần đăng nhập sai @security', async () => {
  test.skip(
    true,
    'BLOCKED: Excel không chỉ rõ số lần thử; cần LOCKOUT_TEST_USERNAME riêng và mailbox/API kiểm tra email.',
  );
});
