#!/bin/bash
# builds m58a (prosthesis card: «کار امروز» and «سفارش لابراتوار» separate) on top of m57a for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m58a/patch-m58a.mjs" "$IR/iran-worker-m57a.mjs" "$IR/iran-worker-m58a.mjs"
node "$W/m58a/patch-m58a.mjs" "$CF/cf-m57a.mjs" "$CF/cf-m58a.mjs"
node --check "$IR/iran-worker-m58a.mjs"; node --check "$CF/cf-m58a.mjs"
md5sum "$IR/iran-worker-m58a.mjs" "$CF/cf-m58a.mjs"
sed -e 's/m57a/m58a/g' "$IR/deploy-m57a.sh" > "$IR/deploy-m58a.sh"; head -2 "$IR/deploy-m58a.sh"
sed -e 's/m57a/m58a/g' "$W/m57a/check-m57a.sh" > "$W/m58a/check-m58a.sh"
sed -e 's/m57a/m58a/g' "$W/m57a/pub-m57a.sh" > "$W/m58a/pub-m58a.sh"
echo built
