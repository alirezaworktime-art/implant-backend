#!/bin/bash
# One-time setup of the staging copy (run as root on the staging server; idempotent).
#   bash setup-staging.sh <hostname> <cert.crt> <cert.key> [deploy-key.pub]
#   e.g. bash setup-staging.sh alavi-stage.itpelc.ir /etc/lego/.lego/certificates/alavi-stage.itpelc.ir.crt /etc/lego/.lego/certificates/alavi-stage.itpelc.ir.key staging-deploy.pub
# Since 2026-11-28 staging runs on the Yazd production server (alavi-stage.itpelc.ir), so it is fully separated from production:
#  - own system user implantstg, own folder /opt/implant-staging, own port 8788, own database (fake data only), no timers
#    (no nightly copy, no monitor, no snapshots, no Cloudflare, no Google Sheet keys); production files are not readable by it
#  - systemd limits (memory, CPU, IO, lower priority) so staging can never slow production down
#  - the GitHub staging deploy logs in as implantstg (never root) and may only restart implant-staging (sudoers)
#  - its own nginx block and certificate for <hostname>; the production block and certificate are not touched
# Needs: /opt/implant-staging/secrets/local.mjs (and code.txt) copied there first (staging values, not production ones).
set -euo pipefail
HOSTNAME_STG=${1:?usage: setup-staging.sh <hostname> <cert.crt> <cert.key> [deploy-key.pub]}; CRT=${2:?cert}; KEY=${3:?key}; PUB=${4:-}
S=/opt/implant-staging; PORT=8788; U=implantstg; N=${NODE_BIN:-/usr/bin/node}   # same Node as production
[ -s "$CRT" ] && [ -s "$KEY" ] || { echo "certificate files missing"; exit 1; }
[ "$($N -p 'process.versions.node.split(".")[0]')" -ge 24 ] || { echo "Node 24+ needed at $N"; exit 1; }

id $U >/dev/null 2>&1 || useradd --system --home-dir $S --shell /bin/bash $U
usermod -s /bin/bash $U                                   # the deploy runs as this user over SSH
mkdir -p $S/{app,data,backups,src,secrets,run,.ssh}
chown $U:$U $S $S/app $S/data $S/run $S/backups $S/src $S/secrets $S/.ssh; chmod 750 $S; chmod 700 $S/secrets $S/.ssh $S/backups
[ -f $S/secrets/local.mjs ] || { echo "missing $S/secrets/local.mjs (copy it first)"; exit 1; }
chown $U:$U $S/secrets/*; chmod 600 $S/secrets/*
# production must stay closed to the staging user
if sudo -u $U test -r /opt/implant/data/implant.db 2>/dev/null || sudo -u $U test -r /etc/implant.env 2>/dev/null; then echo "REFUSED: $U can read production files"; exit 1; fi

# env file: values from secrets/local.mjs, never printed
BH=$($N -e "import('file://$S/secrets/local.mjs').then(m => process.stdout.write(String(m.default.BACKUP_HASH || '')))")
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
Description=Implant plan STAGING (site + API, own database, fake data) — isolated from production
After=network.target
[Service]
User=$U
Group=$U
WorkingDirectory=$S/app
EnvironmentFile=/etc/implant-staging.env
ExecStart=$N $S/app/server.mjs
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$S/data $S/run
PrivateTmp=true
InaccessiblePaths=/opt/implant /etc/implant.env
MemoryMax=1200M
CPUQuota=100%
Nice=10
IOWeight=20
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload; systemctl enable implant-staging >/dev/null 2>&1 || true

# the deploy user may restart only the staging service
SU=/etc/sudoers.d/implant-staging
printf '%s\n' "$U ALL=(root) NOPASSWD: /usr/bin/systemctl restart implant-staging, /usr/bin/systemctl reset-failed implant-staging" > $SU.new
chmod 440 $SU.new; if visudo -cf $SU.new >/dev/null; then mv $SU.new $SU; else rm -f $SU.new; echo "sudoers check failed"; exit 1; fi
if [ -n "$PUB" ]; then grep -qE '^ssh-ed25519 [A-Za-z0-9+/=]+' $PUB || { echo "not an ed25519 key: $PUB"; exit 1; }
  K=$(awk '{print $1" "$2}' $PUB); AK=$S/.ssh/authorized_keys; touch $AK
  grep -vF "$K" $AK > $AK.new || true; printf '%s\n' "restrict $K github-staging-deploy" >> $AK.new; cat $AK.new > $AK; rm -f $AK.new
  chown $U:$U $AK; chmod 600 $AK; echo "staging deploy key: $(grep -c github-staging-deploy $AK) entry (user $U, no terminal, no forwarding)"; fi

# nginx block for the staging hostname only (the production block is not edited); nginx -t before reload, else undo
NG=/etc/nginx/sites-available/implant-staging
cat > $NG <<EOF
server {
  listen 443 ssl http2; listen [::]:443 ssl http2;
  server_name $HOSTNAME_STG;
  ssl_certificate $CRT;
  ssl_certificate_key $KEY;
  ssl_protocols TLSv1.2 TLSv1.3;
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
ln -sf $NG /etc/nginx/sites-enabled/implant-staging
if nginx -t 2>/dev/null; then systemctl reload nginx; echo "nginx: $HOSTNAME_STG → 127.0.0.1:$PORT"; else rm -f /etc/nginx/sites-enabled/implant-staging; nginx -t; echo "nginx -t FAILED, block removed"; exit 1; fi
echo SETUP-DONE
