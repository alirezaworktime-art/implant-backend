cat > /usr/local/bin/implant-snapshot <<'EOF'
#!/bin/bash
# consistent snapshot of everything needed to rebuild the Iran server -> /tmp/bk
set -e
rm -rf /tmp/bk; mkdir -p /tmp/bk
sqlite3 /opt/implant/data/implant.db ".backup '/tmp/bk/implant.db'"
cp /opt/implant/app/*.mjs /opt/implant/app/worker.js /tmp/bk/
tar czf /tmp/bk/server-config.tgz /etc/implant.env /etc/nginx/sites-available/implant /etc/systemd/system/implant.service /etc/systemd/system/implant-nightly.service /etc/systemd/system/implant-nightly.timer /etc/cron.d/implant-dbsnap /etc/ssh/sshd_config.d/99-implant.conf /etc/fail2ban/jail.d/sshd.local /etc/lego /usr/local/bin/implant-snapshot 2>/dev/null
cd /tmp/bk && sha256sum * > SHA256SUMS
EOF
chmod 755 /usr/local/bin/implant-snapshot
implant-snapshot && ls -la /tmp/bk
