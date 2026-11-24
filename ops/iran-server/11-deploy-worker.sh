set -e
node --check /tmp/up/worker.mjs
grep -q "^const IMPORT_KEY='';" /tmp/up/worker.mjs
cp /opt/implant/app/worker.js /opt/implant/backups/worker.$(date +%Y%m%d-%H%M%S).js
install -o implant -g implant -m 644 /tmp/up/worker.mjs /opt/implant/app/worker.js
rm -f /tmp/up/worker.mjs
systemctl restart implant; sleep 2
journalctl -u implant -n 3 --no-pager | tail -3
curl -s localhost:8787/health; echo
curl -s localhost:8787/ | grep -c "data-todoc"
