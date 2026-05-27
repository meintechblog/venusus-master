#!/bin/bash
# venusus-master deploy script — run from local Mac
# Pulls latest from GitHub on the LXC, rebuilds, restarts services.
set -euo pipefail

LXC_HOST="${LXC_HOST:-root@192.168.3.117}"
APP_DIR="/opt/venusus-master"
GITHUB_REPO="https://github.com/meintechblog/venusus-master.git"

echo "==> [1/6] Ensuring app directory exists on $LXC_HOST..."
ssh "$LXC_HOST" "[ -d $APP_DIR ] || git clone $GITHUB_REPO $APP_DIR"

echo "==> [2/6] Pulling latest..."
ssh "$LXC_HOST" "cd $APP_DIR && git fetch && git reset --hard origin/main"

echo "==> [3/6] Installing systemd units + nginx config..."
ssh "$LXC_HOST" "
  install -m 644 $APP_DIR/scripts/venusus-master.service /etc/systemd/system/venusus-master.service
  install -m 644 $APP_DIR/scripts/venusus-embedding.service /etc/systemd/system/venusus-embedding.service
  install -m 644 $APP_DIR/scripts/nginx-venusus-master.conf /etc/nginx/sites-available/venusus-master.conf
  ln -sf /etc/nginx/sites-available/venusus-master.conf /etc/nginx/sites-enabled/venusus-master.conf
  rm -f /etc/nginx/sites-enabled/default
  systemctl daemon-reload
"

echo "==> [4/6] Building Next.js app..."
ssh "$LXC_HOST" "cd $APP_DIR && npm ci --prefer-offline --no-audit && npm run build"

echo "==> [5/6] Starting / restarting services..."
ssh "$LXC_HOST" "
  systemctl enable --now venusus-embedding.service
  systemctl enable --now venusus-master.service
  systemctl restart venusus-master.service
  nginx -t && systemctl reload nginx
"

echo "==> [6/6] Smoke test..."
ssh "$LXC_HOST" "
  sleep 2
  curl -sf http://127.0.0.1:3000/api/stats > /dev/null && echo 'app: OK' || echo 'app: FAIL'
  curl -sf http://127.0.0.1:8765/health > /dev/null && echo 'embedding: OK' || echo 'embedding: FAIL'
  curl -sf http://127.0.0.1/ > /dev/null && echo 'nginx: OK' || echo 'nginx: FAIL'
"

echo ""
echo "Done. Visit http://192.168.3.117/"
