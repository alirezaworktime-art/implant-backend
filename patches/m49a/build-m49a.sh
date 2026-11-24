#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m49a (manager report «ایمپلنت‌های مصرفی»: placed / re-implant / early-failure columns, by brand, files on tap, period fix; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m49a/patch-m49a.mjs" "$IR/iran-worker-m48a.mjs" "$IR/iran-worker-m49a.mjs"
node "$W/m49a/patch-m49a.mjs" "$CF/cf-m48a.mjs" "$CF/cf-m49a.mjs"
node --check "$IR/iran-worker-m49a.mjs"; node --check "$CF/cf-m49a.mjs"
md5sum "$IR/iran-worker-m49a.mjs" "$CF/cf-m49a.mjs"
sed -e 's/m48a/m49a/g' "$IR/deploy-m48a.sh" > "$IR/deploy-m49a.sh"; head -2 "$IR/deploy-m49a.sh"
sed -e 's/m48a/m49a/g' "$W/m48a/check-m48a.sh" > "$W/m49a/check-m49a.sh"
sed -e 's/m48a/m49a/g' "$W/m48a/pub-m48a.sh" > "$W/m49a/pub-m49a.sh"
echo built
