#!/bin/sh
cd /home/claude/cf
python3 mkcode.py >/dev/null
{ echo "/* implant-plan API + site — Cloudflare Worker (D1 binding: DB) */"; cat hashes.js; echo "const IMPORT_KEY='${1:-}';"; echo "const SENDER='user@example.com';"; cat defaults.js; [ -f assets.js ] && cat assets.js; [ -f backup.js ] && cat backup.js; [ -f code.js ] && cat code.js; cat main.js; } > worker.js
