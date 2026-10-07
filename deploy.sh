#!/usr/bin/env bash
# Runs on the VPS from the unpacked folder: builds and starts Session with Docker Compose.
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "Docker isn't installed on this server."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 isn't available (docker compose)."; exit 1; }

if [ ! -f .env ]; then
  pw=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
  port=3000
  while ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}\$"; do port=$((port + 1)); done
  printf 'POSTGRES_PASSWORD=%s\nAPP_PORT=%s\nCOOKIE_SECURE=false\nSEED_DEMO=true\n' "$pw" "$port" > .env
  chmod 600 .env
  echo "Created .env (port ${port}, random database password)."
fi
set -a; . ./.env; set +a

echo "Building and starting Session (the first build takes a few minutes)…"
docker compose -p session up -d --build

echo "Waiting for the app to answer…"
for i in $(seq 1 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${APP_PORT}/login"; then
    ip=$(curl -fsS --max-time 3 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
    echo
    echo "Session is live at  http://${ip}:${APP_PORT}"
    echo "Demo login: lewis@session.test / session"
    if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
      ufw allow "${APP_PORT}/tcp" >/dev/null && echo "(Opened port ${APP_PORT} in ufw.)"
    fi
    exit 0
  fi
  sleep 2
done
echo "The app didn't come up in 3 minutes. Recent logs:"
docker compose -p session logs --tail 60 app
exit 1
