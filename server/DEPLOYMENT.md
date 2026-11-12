# Chuẩn bị triển khai MobiMart API

Backend Hono chạy bằng Node 22; Supabase chỉ cung cấp PostgreSQL. Để webhook SePay nhận giao dịch liên tục, cần thêm một host chạy container/API Node và một URL HTTPS ổn định. Không đổi URL webhook khi host chưa qua các bước kiểm tra bên dưới.

## PostgreSQL trên Supabase

Tạo project riêng cho MobiMart tại vùng Singapore. Backend kết nối PostgreSQL trực tiếp; không dùng Supabase Auth, Data API hoặc các API key của Supabase. Trong bước tạo project, tắt **Enable Data API** để bảng người dùng/đơn hàng không được tự động công bố qua REST.

Project `mobimart` hiện đã được tạo và ở trạng thái Healthy. Migration đã chạy; bảng `orders` và `payment_transactions` tồn tại, catalog có 80 sản phẩm. Mật khẩu nằm trong file local `server/.env.supabase.local` (đã git ignore). Để chạy lại hoặc xác minh mà không in mật khẩu ra terminal:

```bash
cd server
node --env-file=.env.supabase.local scripts/supabase-local.mjs migrate
node --env-file=.env.supabase.local scripts/supabase-local.mjs seed-catalog
node --env-file=.env.supabase.local scripts/supabase-local.mjs verify
```

Vào project → **Connect** → chọn **Session pooler** (cổng `5432`) nếu host chỉ có IPv4. Không chọn Transaction pooler (cổng `6543`): Postgres.js của dự án dùng prepared statements và transaction. Nếu host hỗ trợ IPv6, có thể dùng Direct connection. Sao chép host và user từ Supabase; đừng tự đoán tên host pooler.

Đặt `DATABASE_URL` trong secret/environment của host. Mật khẩu trong URL phải được percent-encode nếu có ký tự đặc biệt. Tối thiểu thêm `?sslmode=require` để mã hóa kết nối. Trước khi nhận dữ liệu thật, tải CA certificate từ **Database Settings → SSL Configuration** và cấu hình `sslmode=verify-full` cùng `sslrootcert` để xác minh máy chủ. Không commit mật khẩu, chuỗi kết nối đã điền, hoặc file `.env`.

Project Supabase Free có thể bị tạm dừng sau một tuần ít hoạt động; gói này phù hợp để chuẩn bị và kiểm thử, chưa bảo đảm nhận webhook tiền thật liên tục. [Giới hạn Free của Supabase](https://supabase.com/kb/faqs/platform/free-project-pausing), [hướng dẫn kết nối PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Host đã chốt cho bản demo: Render (gói Free)

`render.yaml` ở gốc repo là Render Blueprint cho API: runtime Node 22, vùng Singapore, `rootDir: server`,
build `npm ci && npm run migrate` (gói Free không có pre-deploy command; migration chỉ thêm cột nên chạy lại an toàn),
start `npm start`, health check `/healthz`. Render cấp URL cố định `https://mobimart-api.onrender.com` (tên có thể khác nếu đã bị dùng).

1. Code cần nằm trên GitHub (nhánh sẽ deploy). Render Dashboard → **New → Blueprint** → chọn repo và nhánh.
2. Render hỏi các biến `sync: false` một lần: `DATABASE_URL` (Session pooler, như trên), `SUPABASE_URL` +
   `SUPABASE_SECRET_KEY` (ảnh), `SMTP_USER` + `SMTP_PASS` (Gmail App Password), `AI_MODEL` + `AI_API_KEY`,
   các biến SePay (để trống tới khi chốt SePay Live). `JWT_ACCESS_SECRET` do Render tự sinh.
3. Kiểm tra `https://<host>/healthz` trả `200` rồi làm tiếp mục **Chuyển webhook SePay** bên dưới.

Lưu ý gói Free: service **ngủ sau 15 phút** không có request, request đầu tiên mất khoảng 30–60 giây — mở `/healthz` vài phút
trước buổi demo. Webhook SePay rơi vào lúc service đang ngủ sẽ được SePay gửi lại. `ALLOW_DEMO_CHECKOUT=true` trong
Blueprint giữ nút "(Demo) Chuyển sang" cho bản demo (thẻ demo đã bỏ: chỉ thanh toán qua SePay); đặt `false` khi lên production thật.

**Ảnh:** dùng Supabase Storage (`SUPABASE_URL` + `SUPABASE_SECRET_KEY`, xem `README.md` mục "Lưu ảnh"), không cần volume.
Storage dùng Secret key qua header `apikey`, không phụ thuộc Data API (vẫn có thể tắt Data API).
**Email:** `SMTP_USER` + `SMTP_PASS` (Gmail App Password), kiểm tra bằng `npm run mail:test` ở máy local.

## Image API (tuỳ chọn: host chạy container)

```bash
cd server
docker build -t mobimart-api .
```

`Dockerfile` cài dependencies production, chạy migration rồi mở API. Chỉ chạy **một instance** với lệnh khởi động này để tránh hai instance cùng migrate. Host cần gắn volume bền vững vào thư mục ảnh và đặt `UPLOAD_DIR` trỏ tới đó; mặc định `uploads` nằm trong container và mất sau khi thay image/redeploy.

Biến môi trường cần đặt trên host:

| Biến | Giá trị cần điền |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Chuỗi kết nối Supabase đã bật TLS |
| `JWT_ACCESS_SECRET` | Chuỗi ngẫu nhiên mới, tối thiểu 32 ký tự |
| `PORT` | Cổng do host cung cấp, mặc định 4000 |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Lưu ảnh trên Supabase Storage (thay cho volume `UPLOAD_DIR`) |
| `SEPAY_WEBHOOK_API_KEY` | Đúng key đã cấu hình trên webhook SePay; giữ trong secret của host |
| `SEPAY_BANK`, `SEPAY_ACCOUNT_NUMBER`, `SEPAY_ACCOUNT_NAME` | Tài khoản nhận tiền đang hiển thị trên QR |
| `SEPAY_CODE_PREFIX` | `MM` |
| `SEPAY_SIMULATED` | `false` |
| `USD_TO_VND_RATE` | Tỷ giá dùng để tính đúng số tiền trên đơn |
| `CORS_ORIGINS` | Origin của Expo web nếu dùng web |

`SMTP_USER`/`SMTP_PASS` (Gmail App Password) hoặc `SMTP_URL` để gửi email; nếu để trống, mã khôi phục mật khẩu chỉ in ra log và không phù hợp cho người dùng thật. Để bật chatbot Claude trên host, đặt `AI_PROVIDER=anthropic`, `AI_API_KEY` và `AI_MODEL` trong secret/environment của host; để trống `AI_BASE_URL`. API key chỉ nằm trên server, không đưa vào `EXPO_PUBLIC_*` hay app. Xem thêm `server/README.md`.

## Chuyển webhook SePay

1. Đợi host cấp URL HTTPS cố định. Kiểm tra `GET /healthz` trả `200`; migration và catalog đã được chuẩn bị trên database Supabase.
2. Kiểm tra ảnh upload còn đọc được sau khi host khởi động lại. Kiểm tra webhook thiếu/sai API key trả `401`.
3. Trong SePay, sửa webhook MobiMart thành `https://<host>/api/v1/payments/webhook` rồi dùng **Gửi thử**. Bản tin gửi thử có thể bị backend `ignored` do dùng tài khoản/mã mẫu; HTTP `200` chỉ chứng minh đường truyền và xác thực.
4. Tạo một đơn `pending_payment`, chuyển khoản thật với đúng số tiền và mã `MM…`, xác nhận đơn chuyển sang `completed` và giao dịch chỉ được ghi nhận một lần. Chỉ người dùng tự thực hiện bước chuyển tiền.
5. Sau khi đường HTTPS mới hoạt động, tắt tunnel ngrok cũ. Cập nhật `EXPO_PUBLIC_API_URL` trước khi build ứng dụng production.

Cho đến khi hoàn tất bước 1–4, không đổi URL webhook SePay. Ngrok hiện chỉ là môi trường kiểm thử: khi máy cá nhân, Docker, API hoặc tunnel dừng, hệ thống không thể xử lý giao dịch mới; không mở thanh toán thật cho người dùng trong trạng thái này.
