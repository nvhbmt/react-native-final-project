# Bàn giao MobiMart — triển khai bản demo (12/11/2026)

Checklist để người/agent tiếp theo chỉ cần **điền khoá và bấm deploy**. Chi tiết kỹ thuật: `server/README.md`,
`server/DEPLOYMENT.md`. Không commit/in khoá; khoá chỉ nằm ở `server/.env*` (đã gitignore) hoặc trong secret của host.

## Trạng thái

- Nhánh `feat/hiep`. Test: app 22/22, backend 89/89 khi bật đủ DB test (lệnh trong `server/README.md`).
- Kiến trúc: App Expo → **API Node/Hono trên Render** (chưa deploy) → **Supabase** (PostgreSQL + Storage ảnh).
- Đã chạy thật: email Gmail (App Password), lưu ảnh Supabase Storage (bucket `uploads` đã tạo), chatbot Claude.
- Chưa: deploy API, build APK, chuyển webhook SePay sang host, chuyển khoản thật trọn luồng.

## 1. Deploy API lên Render

Repo `nvhbmt/react-native-final-project` là **private** của tài khoản `nvhbmt` → chủ repo kết nối Render
(Render → GitHub → cài Render GitHub App cho repo). Cộng tác viên không tự kết nối được.

1. Render Dashboard → **New → Blueprint** → repo trên, nhánh `feat/hiep` (Blueprint: `render.yaml`).
2. Điền các biến `sync: false` (bảng dưới). `JWT_ACCESS_SECRET` Render tự sinh.
3. Apply → chờ build (build tự chạy migration `0013`–`0019` lên Supabase) → mở `https://<service>.onrender.com/healthz` phải trả `200`.

| Biến | Lấy ở đâu | Bắt buộc |
| --- | --- | --- |
| `DATABASE_URL` | `server/.env.supabase.local` (Supabase **Session pooler**, cổng 5432, `sslmode=require`) | Có |
| `SUPABASE_URL` | `server/.env` (Supabase → Project Settings → API → Project URL) | Có (ảnh) |
| `SUPABASE_SECRET_KEY` | `server/.env` (Supabase → API Keys → **Secret key** `sb_secret_…`) | Có (ảnh) |
| `SMTP_USER`, `SMTP_PASS` | `server/.env` (Gmail + App Password) | Có (quên mật khẩu) |
| `AI_MODEL`, `AI_API_KEY` | `server/.env` (Anthropic) | Có (chatbot) |
| `SEPAY_WEBHOOK_API_KEY`, `SEPAY_BANK`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_NAME` | SePay / tài khoản nhận tiền | Có — thiếu thì không đặt hàng được (đã bỏ thẻ demo) |

Giá trị cố định đã có trong `render.yaml`: `NODE_ENV=production`, `ALLOW_DEMO_CHECKOUT=true` (nút "(Demo) Chuyển sang" bước giao hàng; thẻ demo đã bỏ),
`AI_PROVIDER=anthropic`, `SEPAY_CODE_PREFIX=MM`, `SEPAY_SIMULATED=false`, `USD_TO_VND_RATE=25000`.

## 2. Sau khi API chạy

```bash
cd server
# Tài khoản quản trị: đăng ký trong app (bản trỏ vào host) trước, rồi:
npx tsx --env-file=.env.supabase.local src/db/grantAdmin.ts <email>
# (tuỳ chọn) đánh giá mẫu cho 8 sản phẩm nổi bật:
npx tsx --env-file=.env.supabase.local src/db/seedReviews.ts
```

Kiểm tra nhanh trên app: catalog, đăng ký/đăng nhập, quên mật khẩu (thư tới Gmail), đổi avatar (ảnh lên Supabase),
đặt đơn chuyển khoản VietQR (cần SePay ở bước 4), chatbot, Tài khoản → Quản lý giao hàng / Gửi khuyến mãi (tài khoản admin).

## 3. Build APK (EAS)

```bash
npx eas-cli@latest login
EXPO_PUBLIC_API_URL=https://<service>.onrender.com npx eas-cli@latest build --profile preview --platform android
```

`EXPO_PUBLIC_API_URL` là gốc host (app tự thêm `/api/v1`). Thiếu biến này APK gọi `10.0.2.2` (chỉ đúng emulator).

## 4. SePay Live

Làm theo mục **Chuyển webhook SePay** trong `server/DEPLOYMENT.md`: điền 4 biến `SEPAY_*` trên Render → webhook
`https://<service>.onrender.com/api/v1/payments/webhook` (API Key) → **Gửi thử** → một đơn chuyển khoản thật nhỏ
(người dùng tự chuyển). Tiền tố mã CK trên SePay phải là `MM`. Sau đó tắt tunnel ngrok cũ.

## Lưu ý

- Render Free ngủ sau 15 phút không có request (request đầu ~30–60s) → mở `/healthz` trước buổi demo.
- Supabase Free có thể tạm dừng project sau ~1 tuần ít hoạt động → vào dashboard kiểm tra trước demo.
- Ảnh trên Storage cache CDN lâu (tên file UUID không tái dùng); xoá ảnh có thể còn thấy qua URL cũ một thời gian.
- Giới hạn request đã dùng chung qua DB (`rate_limits`); nút **dừng** câu trả lời AI vẫn theo từng instance → chạy 1 instance.
- `npm audit`: còn 10 lỗi mức moderate trong công cụ dev (eslint/expo fingerprint, drizzle-kit); bản sửa đề xuất là hạ cấp lớn
  (Expo 52), không áp dụng.
- Tài liệu SRS/SDS/báo cáo (thư mục `docs/`, không lên git) cần cập nhật theo `tmp/docs-update-notes.md` trên máy của Hiệp.
