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
└── còn lại → web/ (bản web của app, SPA)
api → db (Postgres 17, không mở cổng ra ngoài)
```

Volume: `db-data` (database), `uploads` (ảnh upload), `caddy-data` (chứng chỉ). Không bị xoá khi deploy lại.

| File trên VPS | Nội dung | Trong git? |
| --- | --- | --- |
| `docker-compose.yml`, `Caddyfile` | Copy từ `deploy/vps/` mỗi lần deploy | Có |
| `.env` | `SITE_ADDRESS`, `POSTGRES_PASSWORD`, `API_TAG` (image đang chạy) | **Không** — `setup.sh` sinh lần đầu |
| `api.env` | Biến của API: JWT secret, SePay, SMTP, AI… | **Không** — `setup.sh` sinh lần đầu, sửa tay |
| `web/` | Bản web của app | Không — build mỗi lần deploy |

## Cài đặt một lần trên GitHub

Settings → Secrets and variables → Actions:

| Loại | Tên | Giá trị |
| --- | --- | --- |
| Secret | `VPS_HOST` | IP VPS |
| Secret | `VPS_SSH_KEY` | Private key SSH (ed25519) có trong `~root/.ssh/authorized_keys` của VPS |
| Secret | `VPS_KNOWN_HOSTS` | Kết quả `ssh-keyscan -H <IP>` (chống giả mạo máy chủ) |
| Variable | `SITE_ADDRESS` | Tên miền trỏ về VPS, vd. `103-82-193-74.sslip.io` (sslip.io không cần mua domain) |

Đổi sang domain riêng: trỏ bản ghi A về IP VPS → đổi variable `SITE_ADDRESS` → sửa `SITE_ADDRESS` trong
`/opt/mobimart/.env` và `CORS_ORIGINS` trong `api.env` → chạy lại workflow.

## Bật SePay / email / AI trên VPS

```bash
ssh root@<IP>
nano /opt/mobimart/api.env          # điền SEPAY_*, SMTP_USER/SMTP_PASS, AI_MODEL/AI_API_KEY
cd /opt/mobimart && docker compose up -d api
```

Webhook SePay: `https://<SITE_ADDRESS>/api/v1/payments/webhook`, chứng thực **API Key** = `SEPAY_WEBHOOK_API_KEY`.
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
(image cũ được giữ 72 giờ). Migration chỉ thêm cột/bảng nên chạy image cũ trên DB mới vẫn an toàn.

App Android/iOS: build với `EXPO_PUBLIC_API_URL=https://<SITE_ADDRESS>` (xem `HANDOFF.md`, mục Build APK).
