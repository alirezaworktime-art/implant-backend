set -e
install -o root -g root -m 755 /tmp/up/monitor.mjs /opt/implant/monitor.mjs; rm -f /tmp/up/monitor.mjs
cat > /usr/local/bin/implant-cert-renew <<'EOF'
#!/bin/bash
# renews the Let's Encrypt certificate when fewer than 30 days are left (TLS-ALPN needs port 443: nginx is stopped only while renewing)
cd /etc/lego || exit 1
if lego run --tls -d alavi.itpelc.ir --renew-days 30 --no-random-sleep --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx"; then
  echo "renew check ok"; systemctl is-active --quiet nginx || systemctl start nginx; systemctl reload nginx
else
  echo "renew FAILED"; systemctl is-active --quiet nginx || systemctl start nginx; exit 1
fi
EOF
chmod 755 /usr/local/bin/implant-cert-renew
cat > /etc/systemd/system/implant-cert.service <<'EOF'
[Unit]
Description=Implant: renew SSL certificate when due
After=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/implant-cert-renew
EOF
cat > /etc/systemd/system/implant-cert.timer <<'EOF'
[Unit]
Description=Implant: daily SSL renewal check 04:17 Tehran
[Timer]
OnCalendar=*-*-* 04:17:00 Asia/Tehran
Persistent=true
[Install]
WantedBy=timers.target
EOF
cat > /etc/systemd/system/implant-monitor.service <<'EOF'
[Unit]
Description=Implant: health check + email alerts + heartbeat
After=network-online.target
[Service]
Type=oneshot
Environment=NODE_NO_WARNINGS=1
ExecStart=/usr/bin/node /opt/implant/monitor.mjs
EOF
cat > /etc/systemd/system/implant-monitor.timer <<'EOF'
[Unit]
Description=Implant: health check every 10 minutes
[Timer]
OnBootSec=3min
OnUnitActiveSec=10min
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now implant-cert.timer implant-monitor.timer
systemctl start implant-cert.service || true
journalctl -u implant-cert --since "-3 min" --no-pager -o cat | tail -4
systemctl start implant-monitor.service || true
journalctl -u implant-monitor --since "-3 min" --no-pager -o cat | tail -3
systemctl list-timers 'implant-*' --no-pager | head -6
