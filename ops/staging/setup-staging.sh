#!/bin/bash
# One-time setup of the staging copy (run as root on the staging server; idempotent).
#   bash setup-staging.sh <hostname>          e.g. demo.impyar.ir
# Needs: /opt/implant-staging/secrets/local.mjs (and code.txt) copied there first; an nginx certificate that covers <hostname>.
# Creates: user implantstg, /opt/implant-staging/{app,data,backups,src,secrets,node,run}, private Node (same version as
# production), /etc/implant-staging.env, systemd implant-staging (127.0.0.1:8788), nginx block for <hostname>.
# Staging has its own database (data/implant.db) and no timers (no nightly copy, no monitor, no snapshots).
set -euo pipefail
HOSTNAME_STG=${1:?usage: setup-staging.sh <hostname>}
NODE_VER=${NODE_VER:-v24.22.0}                     # production runs v24.22.0 (2026-11-26)
S=/opt/implant-staging; PORT=8788; U=implantstg
CERT_DIR=${CERT_DIR:-/etc/letsencrypt/live/impyar.ir}

id $U >/dev/null 2>&1 || useradd --system --home-dir $S --shell /usr/sbin/nologin $U
mkdir -p $S/{app,data,backups,src,secrets,node,run}
chown $U:$U $S/app $S/data $S/run $S/backups; chmod 700 $S/secrets; chown root:root $S/secrets
[ -f $S/secrets/local.mjs ] || { echo "missing $S/secrets/local.mjs (copy it first)"; exit 1; }

# private Node, same version as production; checksum checked
if [ "$($S/node/bin/node -v 2>/dev/null || true)" != "$NODE_VER" ]; then
  T=$(mktemp -d); cd $T
  curl -fsSLO https://nodejs.org/dist/$NODE_VER/node-$NODE_VER-linux-x64.tar.xz
  curl -fsSL https://nodejs.org/dist/$NODE_VER/SHASUMS256.txt | grep " node-$NODE_VER-linux-x64.tar.xz\$" | sha256sum -c -
  rm -rf $S/node/*; tar -xJf node-$NODE_VER-linux-x64.tar.xz -C $S/node --strip-components=1; cd /; rm -rf $T
fi
echo "node: $($S/node/bin/node -v)"

# env file: values from secrets/local.mjs, never printed; no Cloudflare or Google Sheet keys on staging
BH=$($S/node/bin/node -e "import('file://$S/secrets/local.mjs').then(m => process.stdout.write(String(m.default.BACKUP_HASH || '')))")
umask 077; cat > /etc/implant-staging.env <<EOF
NODE_ENV=production
NODE_NO_WARNINGS=1
PORT=$PORT
HOST=127.0.0.1
APP_DIR=$S/app
DB_FILE=$S/data/implant.db
RUN_DIR=$S/run
IMPORT_KEY=
BACKUP_HASH=$BH
EOF
umask 022; unset BH

cat > /etc/systemd/system/implant-staging.service <<EOF
[Unit]
Description=Implant plan STAGING (site + API, own database)
After=network.target
[Service]
User=$U
Group=$U
WorkingDirectory=$S/app
EnvironmentFile=/etc/implant-staging.env
ExecStart=$S/node/bin/node $S/app/server.mjs
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=$S/data $S/run
PrivateTmp=true
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload; systemctl enable implant-staging >/dev/null 2>&1 || true

# nginx block for the staging hostname (other sites are not edited); nginx -t before reload, else undo
N=/etc/nginx/sites-available/implant-staging
cat > $N <<EOF
server {
  listen 443 ssl; listen [::]:443 ssl;
  server_name $HOSTNAME_STG;
  ssl_certificate $CERT_DIR/fullchain.pem;
  ssl_certificate_key $CERT_DIR/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
  client_max_body_size 25m;
  gzip on; gzip_types application/json application/javascript text/css image/svg+xml application/manifest+json; gzip_min_length 1024;
  add_header X-Robots-Tag "noindex, nofollow" always;
  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 60s;
  }
}
server {
  listen 80; listen [::]:80;
  server_name $HOSTNAME_STG;
  return 301 https://\$host\$request_uri;
}
EOF
ln -sf $N /etc/nginx/sites-enabled/implant-staging
if nginx -t 2>/dev/null; then systemctl reload nginx; echo "nginx: $HOSTNAME_STG → 127.0.0.1:$PORT"; else rm -f /etc/nginx/sites-enabled/implant-staging; nginx -t; echo "nginx -t FAILED, block removed"; exit 1; fi
echo SETUP-DONE
