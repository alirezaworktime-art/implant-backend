set -e
install -o implant -g implant -m 644 /tmp/up/server.mjs /opt/implant/app/server.mjs
install -o implant -g implant -m 644 /tmp/up/nightly.mjs /opt/implant/app/nightly.mjs
cat > /etc/systemd/system/implant-nightly.service <<'EOF'
[Unit]
Description=Implant nightly: copy to Cloudflare + summary to Google Sheet
After=network-online.target
[Service]
Type=oneshot
User=implant
Group=implant
Environment=NODE_NO_WARNINGS=1
EnvironmentFile=/etc/implant.env
ExecStart=/usr/bin/node /opt/implant/app/nightly.mjs
EOF
cat > /etc/systemd/system/implant-nightly.timer <<'EOF'
[Unit]
Description=Implant nightly at 00:00 Tehran
[Timer]
OnCalendar=*-*-* 00:00:00 Asia/Tehran
Persistent=true
[Install]
WantedBy=timers.target
EOF
# local nightly DB snapshot (keeps 30)
cat > /etc/cron.d/implant-dbsnap <<'EOF'
30 0 * * * implant sqlite3 /opt/implant/data/implant.db ".backup '/opt/implant/backups/implant-$(date +\%Y\%m\%d).db'" && find /opt/implant/backups -maxdepth 1 -name 'implant-*.db' -mtime +30 -delete
EOF
systemctl daemon-reload
systemctl enable --now implant-nightly.timer
systemctl restart implant; sleep 2
journalctl -u implant -n 3 --no-pager | tail -3
systemctl start implant-nightly.service || true
journalctl -u implant-nightly -n 3 --no-pager | tail -3
systemctl list-timers implant-nightly.timer --no-pager | head -3
curl -s localhost/ | grep -c "GAS_URL=''"
