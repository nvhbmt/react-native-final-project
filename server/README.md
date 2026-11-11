# Market API (`server/`)

Backend cho app React Native: **Hono + Drizzle ORM + Postgres 17**, chạy trên Node 22.
Cây npm riêng, độc lập với app Expo ở thư mục gốc — chạy `npm install` bên trong `server/`.

Gồm: **xác thực** (kể cả quên mật khẩu qua email), **catalog**, **giỏ hàng**, **đơn hàng** với thanh toán
chuyển khoản **SePay (VietQR)**, **đánh giá**, **yêu thích**, **hộp thư**, **góp ý**, **upload ảnh**,
**tài khoản** (hồ sơ, avatar, địa chỉ, xoá tài khoản) và **trợ lý mua sắm AI** (stream SSE).

## Chạy local

```bash
cd server
npm install
cp .env.example .env          # rồi thay JWT_ACCESS_SECRET bằng chuỗi ngẫu nhiên
npm run db:up                 # Postgres trên cổng 5435 (tạo sẵn cả DB market_test)
npm run migrate
npm run db:seed:catalog       # 80 sản phẩm mẫu. Chạy lại giữ nguyên các bản ghi đã có.
npm run dev                   # http://localhost:4000/api/v1
```

Điện thoại thật không gọi được `localhost` — dùng IP LAN của máy dev (`http://192.168.x.x:4000`).
Server lắng nghe trên `0.0.0.0`. Khi `NODE_ENV=development`, mọi origin `http://localhost:<cổng>` đều được
CORS cho phép; môi trường khác chỉ cho các origin trong `CORS_ORIGINS`. App native không bị CORS chặn.

```bash
npm run typecheck
npm test                      # unit test, không cần DB
INTEGRATION=1 DATABASE_URL=postgres://market:market@localhost:5435/market_test npm test
npm run db:generate           # sửa src/db/schema.ts → sinh SQL vào drizzle/ (nhớ commit)
```

Integration test xác thực **xoá dữ liệu trong các bảng xác thực**, nên tên DB bắt buộc chứa `test`.
Catalog, review và các module thương mại (giỏ, đơn, SePay, yêu thích, hộp thư, góp ý, upload, tài khoản, AI)
có integration test trên DB riêng. Chạy đủ:

```bash
for db in market_catalog_test market_reviews_test market_commerce_test; do docker compose exec db createdb -U market $db; done
INTEGRATION=1 DATABASE_URL=postgres://market:market@localhost:5435/market_test \
CATALOG_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_catalog_test \
REVIEWS_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_reviews_test \
COMMERCE_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_commerce_test \
npm test
```

## Database (Docker)

Chỉ Postgres chạy trong Docker (`docker-compose.yml`), API chạy trực tiếp bằng Node để hot reload.
Cần Docker Desktop hoặc OrbStack.

| | Giá trị |
|---|---|
| Image | `postgres:17-alpine` |
| Cổng máy | `5435` (tránh 5433/5434 của các project khác trong workspace) |
| User / mật khẩu | `market` / `market` |
| Database | `market` (dev), `market_test` (integration test) |
| Dữ liệu | volume `server_market-pg`, còn nguyên khi tắt/bật lại container |

```bash
npm run db:up        # bật Postgres, chờ tới khi healthcheck OK
npm run db:down      # tắt container, GIỮ dữ liệu
npm run db:reset     # XOÁ volume, tạo DB mới rồi chạy migration
npm run db:psql      # mở psql vào DB market (\dt để xem bảng)
npm run db:logs      # xem log Postgres
```

- `scripts/init-test-db.sql` tạo `market_test`, nhưng **chỉ chạy lần đầu volume được tạo**. Nếu volume có
  từ trước khi thêm script này, chạy `npm run db:reset` (mất dữ liệu dev) hoặc tạo tay:
  `docker compose exec db createdb -U market market_test`.
- Đổi schema: sửa `src/db/schema.ts` → `npm run db:generate` → xem lại SQL trong `drizzle/` → `npm run migrate`.
  Commit cả thư mục `drizzle/` (kể cả `meta/`).
- Mật khẩu `market/market` chỉ dùng cho dev. Production dùng Postgres riêng và đặt `DATABASE_URL` trong env.

## Cấu trúc

```
src/
├── index.ts                 # Đọc env, kết nối DB, mở cổng
├── app.ts                   # buildApp(deps) — dựng app không mở cổng, test gọi qua app.request()
├── env.ts                   # Kiểm tra biến môi trường bằng zod
├── db/                      # schema.ts, client.ts, migrate.ts
├── lib/                     # http (envelope + AppError), password (scrypt), tokens (JWT), rateLimit, validate
├── middleware/auth.ts       # requireAuth / requireRole
└── modules/
    ├── auth/                # routes → service → repository (Drizzle | in-memory cho test), serialize
    ├── catalog/             # routes → service → repository, dữ liệu seed trong data/
    ├── commerce/pricing.ts  # Định giá dùng chung (giá luôn lấy từ catalog), voucher, thuế
    ├── cart/ favorites/ orders/ reviews/ inbox/ feedback/ uploads/ users/
    ├── payments/            # SePay: mã CK, QR, webhook
    └── ai/                  # provider (OpenAI-compatible), tools, routes SSE
```

Quy ước:

- Import tuyệt đối qua alias `@/` (→ `src/`), giữ đuôi `.ts`: `import { AppError } from '@/lib/http.ts'`.
  File cùng thư mục vẫn import `./`. Alias khai ở **hai** nơi phải sửa cùng nhau: `tsconfig.json`
  (`paths` — tsc và tsx đọc) và `vitest.config.ts` (`resolve.alias` — Vite không đọc `paths`).

- Mọi phản hồi: `{ success: true, data }` hoặc `{ success: false, error: { code, message, details? } }`.
  App nên rẽ nhánh theo `error.code`, không theo `message`.
- Dữ liệu user chỉ rời server qua `modules/auth/serialize.ts` (liệt kê tường minh, không lộ `passwordHash`).
- Triển khai một module mới: tạo `modules/<tên>/routes.ts` rồi mount trong `app.ts`.
- Module cần gửi thông báo cho user gọi `notify()` (`modules/inbox/notify.ts`), dùng được trong transaction.

## Luồng xác thực

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | `{ email, password, fullName }` → 201 `{ user, tokens }` |
| POST | `/api/v1/auth/login` | — | `{ email, password }` → `{ user, tokens }` |
| POST | `/api/v1/auth/refresh` | — | `{ refreshToken }` → `{ user, tokens }` (token cũ hết hiệu lực) |
| POST | `/api/v1/auth/logout` | — | `{ refreshToken }` → thu hồi phiên của thiết bị này |
| POST | `/api/v1/auth/logout-all` | Bearer | Thu hồi mọi phiên của tài khoản |
| GET | `/api/v1/auth/me` | Bearer | Thông tin user |
| POST | `/api/v1/auth/change-password` | Bearer | `{ currentPassword, newPassword }` → phiên mới, các thiết bị khác bị đăng xuất |
| POST | `/api/v1/auth/forgot-password` | — | `{ email }` → luôn `{ sent: true }`; gửi mã 6 số (15 phút) nếu email tồn tại |
| POST | `/api/v1/auth/reset-password` | — | `{ email, code, newPassword }` → `{ user, tokens }`, thu hồi mọi phiên cũ |

Email gửi qua SMTP khi đặt `SMTP_URL` (vd. `smtps://user:pass@smtp.gmail.com:465`) và `MAIL_FROM`.
Không đặt thì nội dung email (kèm mã) được in ra console của server — đủ để thử khi dev.

`tokens = { tokenType: 'Bearer', accessToken, expiresIn, refreshToken, refreshTokenExpiresAt }`.

- **Access token**: JWT HS256, mặc định 15 phút, gửi qua `Authorization: Bearer …`.
- **Refresh token**: chuỗi ngẫu nhiên 256 bit, mặc định 30 ngày; DB chỉ lưu SHA-256.
  Mỗi lần refresh sẽ **xoay vòng**. Nếu một token đã xoay vòng bị dùng lại → coi như bị lộ,
  thu hồi cả chuỗi (`REFRESH_TOKEN_REUSED`), chỉ ảnh hưởng thiết bị đó.
- Mật khẩu băm bằng `scrypt` của Node (không cần native addon). Sai email hay sai mật khẩu
  đều trả cùng `INVALID_CREDENTIALS`, thời gian phản hồi tương đương.
- `register` / `login` giới hạn 20 lần / 15 phút / IP (bộ nhớ trong tiến trình — cần Redis khi chạy nhiều instance).

Phía app (gợi ý khi nối): lưu refresh token bằng `expo-secure-store`, access token giữ trong bộ nhớ.
Gặp `401 TOKEN_EXPIRED` → gọi `/auth/refresh` **một lần** (gộp các request đang chờ) rồi gửi lại;
refresh thất bại → về màn đăng nhập.

| Mã lỗi | HTTP | Ý nghĩa |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `details: [{ field, message }]` |
| `WRONG_PASSWORD` | 400 | Mật khẩu hiện tại sai khi đổi mật khẩu |
| `UNAUTHORIZED` | 401 | Thiếu token / tài khoản không tồn tại |
| `TOKEN_EXPIRED` | 401 | Access token sai hoặc hết hạn → refresh |
| `INVALID_CREDENTIALS` | 401 | Sai email hoặc mật khẩu |
| `INVALID_REFRESH_TOKEN` / `REFRESH_TOKEN_REUSED` | 401 | Phải đăng nhập lại |
| `EMAIL_TAKEN` | 409 | Email đã đăng ký |
| `RATE_LIMITED` | 429 | Có header `Retry-After` |
| `INVALID_RESET_CODE` | 400 | Mã đặt lại mật khẩu sai, hết hạn hoặc đã khoá (5 lần sai) |

## Catalog sản phẩm

Các route dưới `/api/v1` dùng phương thức GET và có thể gọi công khai.

| Path | Dữ liệu trả về |
|---|---|
| `/home` | `categories`, `banners`, `deals`, `recommendedProducts` |
| `/categories` | Danh mục, danh mục con và ảnh đại diện |
| `/products` | `items` và `nextCursor` cho tìm kiếm, lọc và phân trang |
| `/products/:id` | Thông tin thẻ sản phẩm, thư viện ảnh, mô tả, màu, kích cỡ, đánh giá tổng hợp và nguồn |
| `/products/:id/related` | Sản phẩm cùng danh mục, ưu tiên cùng danh mục con. `limit` mặc định 6, tối đa 20. |
| `/products/:id/size-guide` | Bảng kích cỡ từ nguồn hoặc `null` nếu chưa có bảng |

`/products` nhận `q`, `category`, `subcategory`, `sort` (`sales`, `matched`, `popular`), `minPrice`,
`maxPrice`, `minRating`, `shipping[]`, `benefits[]`, `relatedTo`, `limit` (mặc định 20, tối đa 50) và `cursor`.
`relatedTo` giới hạn kết quả vào danh mục của sản phẩm tham chiếu và bỏ chính sản phẩm đó.
Lặp tham số để chọn nhiều mục. Sản phẩm phải có ít nhất một cách giao đã chọn và đủ các quyền lợi đã chọn.
Giữ nguyên bộ lọc khi gửi lại `nextCursor`. Giá nhận và trả theo USD.

```text
/api/v1/products?category=electronics&minPrice=100&minRating=4&shipping[]=express&shipping[]=standard&benefits[]=best-deal
```

Seed có 20 sản phẩm cho mỗi nhóm `electronics`, `fashion`, `beauty`, `fruits`. Mỗi bản ghi lưu trang nguồn.
Ảnh do CDN của nguồn cung cấp. Ảnh trái cây có `imageAttribution` dẫn đến trang tệp Wikimedia Commons.
`priceBasis` phân biệt giá niêm yết (`listed`), giá từ (`from`) và giá tham chiếu (`reference`).
Giá trái cây dùng giá bán lẻ trung bình của USDA ERS năm 2023, theo USD/lb (`priceUnit: lb`).
Các lựa chọn giao hàng và quyền lợi trong seed là cấu hình mẫu của marketplace để thử bộ lọc.
Các giá trị chưa xác minh như số lượt bán, tồn kho và bảng kích cỡ có thể là `null`.
Sắp xếp `sales` ưu tiên sản phẩm nổi bật khi chưa có số lượt bán.

## Giỏ hàng, yêu thích, tài khoản, hộp thư, góp ý, upload

Tất cả cần `Authorization: Bearer`. Dưới tiền tố `/api/v1`:

| Method và path | Mô tả |
| --- | --- |
| `GET /cart` · `DELETE /cart` | Giỏ của tài khoản `{ items, voucher, totals }` (giá tính lại theo catalog) / xoá giỏ |
| `POST /cart/items` · `PATCH/DELETE /cart/items/:key` | Thêm (cộng dồn, tối đa 99/dòng, 50 dòng) · đổi số lượng (0 = xoá) · xoá |
| `POST /cart/merge` | `{ items, voucher? }` gộp giỏ khách sau khi đăng nhập, bỏ qua dòng không hợp lệ |
| `POST/DELETE /cart/voucher` | Áp / bỏ mã (`SALE10`, `FREESHIP`) |
| `GET /favorites` · `PUT/DELETE /favorites/:productId` | `{ items, ids }` · thêm/bỏ (idempotent) |
| `PATCH /users/me` | `{ fullName?, phone? }` |
| `PUT /users/me/avatar` | `{ uploadId \| null }` — ảnh đã upload với `purpose=avatar` |
| `DELETE /users/me` | `{ password }` — xoá vĩnh viễn, dữ liệu liên quan xoá theo cascade |
| `GET/POST /users/me/addresses` · `PATCH/DELETE /users/me/addresses/:id` | Tối đa 10, luôn giữ một địa chỉ mặc định |
| `GET /inbox?limit&cursor&unread=1` · `GET /inbox/unread-count` | Thông báo (mới nhất trước) · số chưa đọc |
| `POST /inbox/:id/read` · `POST /inbox/read-all` | Đánh dấu đã đọc |
| `POST /feedback` · `GET /feedback` | `{ mood?, topics[], comment, imageIds[], rating, productId?, orderId? }` · góp ý đã gửi |
| `POST /uploads` | Multipart (`file`, `purpose`) hoặc JSON `{ purpose, data: <base64> }`. JPEG/PNG/WebP ≤ 5MB (kiểm tra magic bytes). Trả `{ id, url }` |
| `GET /uploads/:file` | Phục vụ ảnh (ngoài `/api/v1`), URL tương đối — app ghép với địa chỉ API |

Ảnh lưu trong `UPLOAD_DIR` (mặc định `./uploads`, đã gitignore). Production nên trỏ tới volume bền vững.

## Đơn hàng và thanh toán SePay

| Method và path | Hành vi |
| --- | --- |
| `GET /payment-methods` | `sepay` (khi đã cấu hình) + thẻ demo (khi `NODE_ENV` ≠ production) |
| `POST /orders` | `{ requestId, paymentMethod, items, voucher? }`. Server tính giá từ catalog; gửi lại cùng `requestId` + cùng nội dung trả đơn cũ. Thẻ demo → `completed` ngay. `sepay` → `pending_payment` kèm `payment` (ngân hàng, STK, chủ TK, `amountVnd`, nội dung CK, `qrUrl`, hạn). Giỏ server được xoá. |
| `GET /orders` · `GET /orders/:id` | Lịch sử (phân trang cursor) · chi tiết của chính user |
| `POST /orders/:id/pay` | Lấy lại / gia hạn hướng dẫn chuyển khoản cho đơn đang chờ (mã CK giữ nguyên) |
| `POST /orders/:id/cancel` | Huỷ đơn chờ thanh toán hoặc đơn demo. Đơn đã trả tiền thật → `409 ORDER_NOT_CANCELLABLE` |
| `POST /payments/webhook` | Webhook SePay, xác thực `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` |

Luồng SePay: khách quét QR (`qr.sepay.vn`) hoặc chuyển tay với nội dung `DH` + 8 ký tự → SePay thấy tiền vào
tài khoản và gọi webhook → server tìm mã trong `code`/`content`, ghi giao dịch vào `payment_transactions`
(unique theo id giao dịch SePay nên gửi lại không bị xử lý hai lần), rồi:

- đủ tiền và đơn đang chờ → `completed`, `paidAt`, gửi thông báo vào hộp thư;
- thiếu tiền → giữ chờ thanh toán, `result: underpaid`, báo cho khách;
- đơn đã huỷ/đã trả → `result: late` (cần hoàn tiền thủ công), báo cho khách;
- không có mã hoặc tiền ra → `unmatched` / `ignored`.

Webhook luôn trả `200 { success: true, result }` cho payload hợp lệ để SePay không gửi lại.
Giá catalog tính USD; số tiền chuyển khoản = tổng USD × `USD_TO_VND_RATE`, chốt lúc tạo đơn.

Cấu hình (`.env`, thiếu một biến thì server dừng lúc khởi động):

```bash
SEPAY_WEBHOOK_API_KEY=...        # tự đặt chuỗi ngẫu nhiên, dán cùng giá trị vào SePay
SEPAY_BANK=MBBank                # tên ngân hàng theo SePay
SEPAY_ACCOUNT_NUMBER=0123456789
SEPAY_ACCOUNT_NAME="NGUYEN VAN A"
SEPAY_CODE_PREFIX=DH             # khớp "Cấu trúc mã thanh toán" trên SePay
SEPAY_PAYMENT_TTL_MINUTES=30
USD_TO_VND_RATE=25000
```

Trên my.sepay.vn: liên kết tài khoản ngân hàng → **Cấu hình công ty → Cấu trúc mã thanh toán**: tiền tố `DH`,
hậu tố 8 ký tự chữ + số → **Tích hợp Webhooks**: URL `https://<domain>/api/v1/payments/webhook`, sự kiện
"Có tiền vào", chứng thực **API Key** = `SEPAY_WEBHOOK_API_KEY`. Khi dev, mở tunnel (vd. `ngrok http 4000`)
để SePay gọi được máy local, hoặc tự giả lập webhook:

```bash
curl -X POST http://localhost:4000/api/v1/payments/webhook \
  -H "Authorization: Apikey $SEPAY_WEBHOOK_API_KEY" -H 'Content-Type: application/json' \
  -d '{"id":123456,"gateway":"MBBank","transactionDate":"2026-11-11 10:00:00","accountNumber":"0123456789",
       "code":null,"content":"DHABCD2345 chuyen tien","transferType":"in","transferAmount":67000,
       "accumulated":0,"subAccount":null,"referenceCode":"FT123","description":""}'
```

## Đánh giá sản phẩm

Các route sau dùng tiền tố `/api/v1`.

| Method và path | Quyền truy cập | Hành vi |
| --- | --- | --- |
| `GET /products/:id/reviews` | Công khai | Nhận `rating` (1–5), `limit` (mặc định 10, tối đa 30) và `cursor`. Trả `items`, `nextCursor` và `summary` của tất cả đánh giá trong app, kể cả khi lọc sao. |
| `GET /products/:id/reviews/eligibility` | Đăng nhập | Kiểm tra điều kiện viết đánh giá, có thể giới hạn vào `orderId`. |
| `POST /products/:id/reviews` | Người đã mua | Nhận `rating` (số nguyên 1–5), `content` (1–1000 ký tự) và `orderId?`. Chỉ nhận đánh giá cho sản phẩm thuộc đơn đã hoàn tất của chính tài khoản. Gửi trùng trả `409 REVIEW_EXISTS`. |

Checkout demo không thu tiền và chỉ tạo đơn khi `NODE_ENV` là `development` hoặc `test`. Ở production chỉ đơn
đã thanh toán qua SePay (`paymentMode: verified`) mới đủ điều kiện đánh giá. Đánh giá dựa trên đơn demo mang nhãn
**Demo order**. Điểm đánh giá đã nhập từ các nguồn catalog vẫn được lưu riêng.

Chạy test tích hợp review trên một database dành riêng cho test:

```bash
docker compose exec db createdb -U market market_reviews_test
REVIEWS_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_reviews_test npm test
```

## Trợ lý mua sắm AI

Model gọi qua API tương thích **OpenAI Chat Completions** (stream + tool calling) — OpenAI, OpenRouter, Groq,
Ollama, … Đặt `AI_BASE_URL` (vd. `https://api.openai.com/v1`), `AI_API_KEY`, `AI_MODEL`. Khoá chỉ nằm trên server.
Thiếu cấu hình thì CRUD hội thoại vẫn chạy, gửi tin trả `503 AI_UNAVAILABLE`, `GET /ai/conversations` trả `available: false`.

| Method và path | Mô tả |
| --- | --- |
| `GET/POST /ai/conversations` | Danh sách `{ items, available }` · tạo `{ title?, productId?, orderId? }` (gắn ngữ cảnh) |
| `GET/DELETE /ai/conversations/:id` | Chi tiết · xoá (dừng câu trả lời đang chạy) |
| `GET /ai/conversations/:id/messages?limit&before` | Lịch sử cũ → mới, phân trang ngược, `hasMore` |
| `POST /ai/conversations/:id/messages` | `{ content }` (≤ 2000 ký tự) → `text/event-stream`: `start` `{ userMessage, assistantMessageId }`, `tool` `{ name }`, `delta` `{ text }`, `done` `{ message }`, `error` `{ code, message }` |
| `POST /ai/conversations/:id/messages/:messageId/stop` | Dừng; phần đã trả lời được lưu với `status: stopped` |
| `POST /ai/messages/:id/rating` | `{ rating: 1 \| -1 \| null }` |

- Tool: `search_products`, `get_product` (catalog công khai), `list_my_orders` (chỉ đơn của user đang chat).
  Tối đa 4 vòng gọi tool mỗi câu trả lời. Gửi 20 tin gần nhất làm lịch sử.
- Trợ lý ghi `[product:<id>]` khi nhắc sản phẩm; app hiển thị thành liên kết.
- Giới hạn 30 tin/giờ/user, một câu trả lời đang chạy/user (`409 AI_BUSY`). Lưu `ai_conversations`, `ai_messages`.
