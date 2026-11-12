#!/usr/bin/env bash
# Chuẩn bị VPS Ubuntu lần đầu (chạy lại an toàn): swap, Docker, tường lửa, thư mục /opt/mobimart, file .env.
# Chạy với quyền root:  bash setup.sh <SITE_ADDRESS>   vd. bash setup.sh mobimart.cunpoi.tech
# (Nhiều tên: "a.example.com, b.example.com" — Caddy xin chứng chỉ cho từng tên.)
set -euo pipefail
SITE_ADDRESS="${1:?Cần SITE_ADDRESS, vd. mobimart.cunpoi.tech}"
APP_DIR=/opt/mobimart

# 1. Swap 2GB — máy 1GB RAM dễ hết bộ nhớ khi Postgres + Node cùng chạy
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2. Docker + compose plugin (gói của Ubuntu)
if ! command -v docker >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq docker.io docker-compose-v2 >/dev/null
  systemctl enable --now docker
fi

# 3. Tường lửa: chỉ SSH, HTTP, HTTPS
if command -v ufw >/dev/null; then
  ufw allow OpenSSH >/dev/null && ufw allow 80/tcp >/dev/null && ufw allow 443 >/dev/null
  ufw --force enable >/dev/null
fi

CORS_ORIGINS=$(echo "$SITE_ADDRESS" | tr -d ' ' | sed 's#^#https://#; s#,#,https://#g')

# 4. Thư mục ứng dụng + bí mật sinh ngay trên VPS (không bao giờ nằm trong git)
mkdir -p "$APP_DIR/web"
cd "$APP_DIR"
if [ ! -f .env ]; then
  cat > .env <<ENV
SITE_ADDRESS="$SITE_ADDRESS"
POSTGRES_PASSWORD=$(openssl rand -hex 24)
ENV
fi
if [ ! -f api.env ]; then
  cat > api.env <<ENV
# Biến cho API — sửa xong chạy: cd $APP_DIR && docker compose up -d api
JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')
CORS_ORIGINS=$CORS_ORIGINS
# Bản demo: nút "(Demo) Chuyển sang" bước giao hàng. Đặt false khi lên production thật.
ALLOW_DEMO_CHECKOUT=true
SEPAY_SIMULATED=false
SEPAY_CODE_PREFIX=MM
USD_TO_VND_RATE=25000
# SePay thật — để trống thì app không có phương thức thanh toán nào.
# Webhook trên my.sepay.vn: https://$SITE_ADDRESS/api/v1/payments/webhook (chứng thực API Key)
SEPAY_WEBHOOK_API_KEY=
SEPAY_BANK=
SEPAY_ACCOUNT_NUMBER=
SEPAY_ACCOUNT_NAME=
# Email (Gmail App Password) — để trống thì mã đặt lại mật khẩu chỉ in ra log
SMTP_USER=
SMTP_PASS=
# Trợ lý AI — để trống thì chat trả 503 AI_UNAVAILABLE
AI_PROVIDER=anthropic
AI_MODEL=
AI_API_KEY=
ENV
  chmod 600 api.env .env
fi
echo "VPS sẵn sàng: $APP_DIR (SITE_ADDRESS=$SITE_ADDRESS)"
