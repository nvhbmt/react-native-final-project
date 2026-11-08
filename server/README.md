# Market API (`server/`)

Backend cho app React Native: **Hono + Drizzle ORM + Postgres 17**, chạy trên Node 22.
Cây npm riêng, độc lập với app Expo ở thư mục gốc — chạy `npm install` bên trong `server/`.

Hiện đã có **xác thực**, **catalog sản phẩm**, **đặt đơn demo** và **đánh giá sản phẩm**.
Các chức năng còn lại (đồng bộ giỏ hàng, lịch sử và huỷ đơn, cổng thanh toán, góp ý, yêu thích, hộp thư, upload,
**chat AI**) đã chốt đường dẫn và trả `501 NOT_IMPLEMENTED` — xem `src/modules/planned.ts`
hoặc gọi `GET /api/v1`.

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
Catalog có integration test riêng trên một database có hậu tố `_catalog_test`.

```bash
docker compose exec db createdb -U market market_catalog_test
CATALOG_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_catalog_test npm test
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
    └── planned.ts           # Danh sách endpoint dự kiến, trả 501
```

Quy ước:

- Import tuyệt đối qua alias `@/` (→ `src/`), giữ đuôi `.ts`: `import { AppError } from '@/lib/http.ts'`.
  File cùng thư mục vẫn import `./`. Alias khai ở **hai** nơi phải sửa cùng nhau: `tsconfig.json`
  (`paths` — tsc và tsx đọc) và `vitest.config.ts` (`resolve.alias` — Vite không đọc `paths`).

- Mọi phản hồi: `{ success: true, data }` hoặc `{ success: false, error: { code, message, details? } }`.
  App nên rẽ nhánh theo `error.code`, không theo `message`.
- Dữ liệu user chỉ rời server qua `modules/auth/serialize.ts` (liệt kê tường minh, không lộ `passwordHash`).
- Triển khai một module mới: tạo `modules/<tên>/routes.ts`, mount trong `app.ts` **trước** `plannedRoutes`,
  rồi xoá các dòng tương ứng trong `planned.ts`.

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
| `NOT_IMPLEMENTED` | 501 | Endpoint placeholder |

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

## Đơn demo và đánh giá sản phẩm

Chạy `npm run migrate` để áp dụng `0002_orders_reviews.sql`. Các route sau dùng tiền tố `/api/v1`.

| Method và path | Quyền truy cập | Hành vi |
| --- | --- | --- |
| `POST /orders` | Đăng nhập | Nhận `requestId`, `paymentMethod`, `items: [{ productId, quantity, options? }]` và `voucher?`. Server kiểm tra sản phẩm, biến thể, tính tổng từ catalog và lưu đơn demo. Gửi lại cùng `requestId` với cùng nội dung trả về đơn đã lưu. |
| `GET /orders/:id` | Chủ đơn | Lấy sản phẩm và tổng tiền đã lưu của đơn. |
| `GET /products/:id/reviews` | Công khai | Nhận `rating` (1–5), `limit` (mặc định 10, tối đa 30) và `cursor`. Trả `items`, `nextCursor` và `summary` của tất cả đánh giá trong app, kể cả khi lọc sao. |
| `GET /products/:id/reviews/eligibility` | Đăng nhập | Kiểm tra điều kiện viết đánh giá, có thể giới hạn vào `orderId`. |
| `POST /products/:id/reviews` | Người đã mua | Nhận `rating` (số nguyên 1–5), `content` (1–1000 ký tự) và `orderId?`. Chỉ nhận đánh giá cho sản phẩm thuộc đơn đã hoàn tất của chính tài khoản. Gửi trùng trả `409 REVIEW_EXISTS`. |

Checkout demo không thu tiền và chỉ tạo đơn khi `NODE_ENV` là `development` hoặc `test`. Production cần dữ liệu đơn được xác thực từ cổng thanh toán. Đánh giá dựa trên đơn demo mang nhãn **Demo order**. Điểm đánh giá đã nhập từ các nguồn catalog vẫn được lưu riêng.

Chạy test tích hợp review trên một database dành riêng cho test:

```bash
docker compose exec db createdb -U market market_reviews_test
REVIEWS_TEST_DATABASE_URL=postgres://market:market@localhost:5435/market_reviews_test npm test
```

## Chat AI (dự kiến)

Endpoint đã chốt dưới `/api/v1/ai/*` (hội thoại, tin nhắn, dừng stream, đánh giá câu trả lời).
Hướng triển khai:

- Câu trả lời stream bằng **SSE** (`text/event-stream`, `hono/streaming`) từ `POST /ai/conversations/:id/messages`.
- Lưu `ai_conversations` / `ai_messages` trong Postgres, gắn `userId`; hội thoại có thể gắn `productId`/`orderId` làm ngữ cảnh.
- Trợ lý gọi tool nội bộ (tìm sản phẩm, xem đơn của chính user) — tool chạy với quyền của user đang đăng nhập,
  không bao giờ truy cập dữ liệu người khác.
- Khoá API của nhà cung cấp chỉ nằm trên server (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` trong `.env`), không đưa vào app.
- Cần rate limit riêng theo user và giới hạn độ dài tin nhắn để kiểm soát chi phí.
