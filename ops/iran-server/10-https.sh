set -e
C=/etc/lego/.lego/certificates
cat > /etc/nginx/sites-available/implant <<EOF
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  return 301 https://\$host\$request_uri;
}
server {
  listen 443 ssl http2 default_server;
  listen [::]:443 ssl http2 default_server;
  server_name _;
  ssl_certificate     $C/alavi.itpelc.ir.crt;
  ssl_certificate_key $C/alavi.itpelc.ir.key;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 1d;
  client_max_body_size 25m;
  gzip on; gzip_types application/json application/javascript text/css image/svg+xml application/manifest+json; gzip_min_length 1024;
  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_read_timeout 60s;
  }
}
EOF
nginx -t && systemctl reload nginx
curl -sk https://localhost/health; echo
