set -e
export DEBIAN_FRONTEND=noninteractive
timedatectl set-timezone Asia/Tehran
# use all disk space
lvextend -l +100%FREE -r /dev/ubuntu-vg/ubuntu-lv || true
apt-get update -q
apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
apt-get -y -q install ca-certificates curl gnupg nginx sqlite3 ufw fail2ban unattended-upgrades jq
# Node.js 24 LTS
if ! command -v node >/dev/null || ! node -v | grep -q '^v24'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get -y -q install nodejs
fi
# SSH: key only (key already works)
test -s /root/.ssh/authorized_keys
cat > /etc/ssh/sshd_config.d/99-implant.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config.d/50-cloud-init.conf || true
sshd -t && systemctl reload ssh
# firewall (provider NAT forwards SSH_PORT -> 22)
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
# fail2ban for ssh
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 6
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades
useradd -r -m -d /opt/implant -s /usr/sbin/nologin implant 2>/dev/null || true
mkdir -p /opt/implant/app /opt/implant/data /opt/implant/backups
chown -R implant:implant /opt/implant
echo "==== DONE"
node -v; nginx -v 2>&1; df -h / | tail -1; ufw status | head -8
