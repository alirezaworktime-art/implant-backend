set -e
install -o implant -g implant -m 644 /tmp/up/server.mjs /opt/implant/app/server.mjs
install -o implant -g implant -m 644 /tmp/up/worker.js /opt/implant/app/worker.js
touch /etc/implant.env; chmod 600 /etc/implant.env
grep -q '^BACKUP_HASH=' /etc/implant.env || cat /tmp/up/bh.env >> /etc/implant.env
cat > /etc/systemd/system/implant.service <<'EOF'
[Unit]
Description=Implant plan (site + API)
After=network.target
[Service]
User=implant
Group=implant
WorkingDirectory=/opt/implant/app
Environment=NODE_ENV=production NODE_NO_WARNINGS=1 PORT=8787 HOST=127.0.0.1
EnvironmentFile=/etc/implant.env
ExecStart=/usr/bin/node /opt/implant/app/server.mjs
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/implant/data
PrivateTmp=true
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/nginx/sites-available/implant <<'EOF'
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  client_max_body_size 25m;
  gzip on; gzip_types application/json application/javascript text/css text/html image/svg+xml application/manifest+json; gzip_min_length 1024;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
  }
}
EOF
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/implant /etc/nginx/sites-enabled/implant
nginx -t
systemctl daemon-reload
systemctl enable implant
systemctl restart implant nginx
sleep 2
systemctl is-active implant
journalctl -u implant -n 5 --no-pager
curl -s localhost/health; echo
curl -s -o /dev/null -w "home %{http_code} %{size_download}\n" localhost/
rm -f /tmp/up/bh.env
