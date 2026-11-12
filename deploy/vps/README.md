# Deploy MobiMart lên VPS

Pipeline `.github/workflows/ci-cd.yml`:

| Sự kiện | Việc chạy |
| --- | --- |
| Pull request | CI: app (typecheck, lint, test) + server (typecheck, toàn bộ test kể cả integration trên Postgres) |
| Push vào `main` | CI như trên → nếu xanh thì **deploy** lên VPS |
| Chạy tay (Actions → CI/CD → Run workflow, nhánh `main`) | Deploy lại bản hiện tại |

Job deploy: build bản web của app (`expo export`, `EXPO_PUBLIC_API_URL=https://SITE_ADDRESS`) và image API
trên máy GitHub → gửi sang VPS qua SSH (`docker load`) → `setup.sh` (idempotent) → `docker compose up -d`
(container API tự chạy migration trước khi nhận request) → seed catalog → kiểm tra `/healthz`, `/api/v1/home`, trang web.

## Kiến trúc trên VPS (`/opt/mobimart`)

```
Caddy :80/:443 (HTTPS tự động, Let's Encrypt)
├── /api/*, /uploads/*, /healthz → api:4000 (Node/Hono, image mobimart-api:<commit>)
└── còn lại → site/current/ (bản web của app, SPA)
api → db (Postgres 17, không mở cổng ra ngoài)
```

Volume: `db-data` (database), `uploads` (ảnh upload), `caddy-data` (chứng chỉ). Không bị xoá khi deploy lại.

| File trên VPS | Nội dung | Trong git? |
| --- | --- | --- |
| `docker-compose.yml`, `Caddyfile` | Copy từ `deploy/vps/` mỗi lần deploy | Có |
| `.env` | `SITE_ADDRESS`, `POSTGRES_PASSWORD`, `API_TAG` (image đang chạy) | **Không** — `setup.sh` sinh lần đầu |
| `api.env` | Biến của API: JWT secret, SePay, SMTP, AI… | **Không** — `setup.sh` sinh lần đầu, sửa tay |
| `site/<commit>/`, `site/current` | Bản web của app; `current` là symlink tới bản đang chạy (giữ 3 bản) | Không — build mỗi lần deploy |

## Cài đặt một lần trên GitHub

Settings → Secrets and variables → Actions:

| Loại | Tên | Giá trị |
| --- | --- | --- |
| Secret | `VPS_HOST` | IP VPS |
| Secret | `VPS_SSH_KEY` | Private key SSH (ed25519) có trong `~root/.ssh/authorized_keys` của VPS |
| Secret | `VPS_KNOWN_HOSTS` | Kết quả `ssh-keyscan -H <IP>` (chống giả mạo máy chủ) |
| Variable | `SITE_ADDRESS` | Tên miền chính của app: `mobimart.cunpoi.tech` (dự phòng: `103-82-193-74.sslip.io`) |

## Tên miền

Đang dùng **`mobimart.cunpoi.tech`** (DNS của `cunpoi.tech` ở Cloudflare). Bản ghi cần có:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `mobimart` | `103.82.193.74` | **DNS only** (mây xám) |

Để **DNS only**: Caddy tự xin chứng chỉ Let's Encrypt qua HTTP-01, và câu trả lời AI stream SSE không bị
Cloudflare gom bộ đệm. Bật proxy (mây cam) thì phải đặt SSL/TLS = Full (strict) và tắt "Always Use HTTPS"
cho subdomain này, nếu không Caddy không xin được chứng chỉ.

Caddy phục vụ cả hai tên (`SITE_ADDRESS="mobimart.cunpoi.tech, 103-82-193-74.sslip.io"` trong
`/opt/mobimart/.env`, `CORS_ORIGINS` tương ứng trong `api.env`), nên tên sslip.io vẫn chạy khi đổi DNS.
Variable `SITE_ADDRESS` trên GitHub chỉ ghi **một** tên — tên mà bản web và app gọi API tới.

## Bật SePay / email / AI trên VPS

```bash
ssh root@<IP>
nano /opt/mobimart/api.env          # điền SEPAY_*, SMTP_USER/SMTP_PASS, AI_MODEL/AI_API_KEY
cd /opt/mobimart && docker compose up -d api
```

Webhook SePay: `https://mobimart.cunpoi.tech/api/v1/payments/webhook`, chứng thực **API Key** = `SEPAY_WEBHOOK_API_KEY`.
Thẻ demo đã bỏ, nên **chưa điền SePay thì app không đặt hàng được**.

## Vận hành

```bash
cd /opt/mobimart
docker compose ps                      # trạng thái
docker compose logs -f api             # log API
docker compose exec db psql -U mobimart mobimart
docker compose exec -T db pg_dump -U mobimart mobimart | gzip > backup-$(date +%F).sql.gz   # sao lưu DB
```

Quay về bản trước: `docker image ls mobimart-api` → sửa `API_TAG` trong `.env` → `docker compose up -d api`
(image cũ được giữ 72 giờ). Bản web: `ln -sfn <commit> site/current.tmp && mv -T site/current.tmp site/current`. Migration chỉ thêm cột/bảng nên chạy image cũ trên DB mới vẫn an toàn.

App Android/iOS: build với `EXPO_PUBLIC_API_URL=https://mobimart.cunpoi.tech` (xem `HANDOFF.md`, mục Build APK).
