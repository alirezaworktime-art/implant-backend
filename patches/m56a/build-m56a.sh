#!/bin/bash
# builds m56a (tariffs of Baseri and University clinics in «سایر کلینیک‌ها», our fee, «انجام کار» only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m56a/patch-m56a.mjs" "$IR/iran-worker-m55a.mjs" "$IR/iran-worker-m56a.mjs"
node "$W/m56a/patch-m56a.mjs" "$CF/cf-m55a.mjs" "$CF/cf-m56a.mjs"
node --check "$IR/iran-worker-m56a.mjs"; node --check "$CF/cf-m56a.mjs"
md5sum "$IR/iran-worker-m56a.mjs" "$CF/cf-m56a.mjs"
sed -e 's/m55a/m56a/g' "$IR/deploy-m55a.sh" > "$IR/deploy-m56a.sh"; head -2 "$IR/deploy-m56a.sh"
sed -e 's/m55a/m56a/g' "$W/m55a/check-m55a.sh" > "$W/m56a/check-m56a.sh"
sed -e 's/m55a/m56a/g' "$W/m55a/pub-m55a.sh" > "$W/m56a/pub-m56a.sh"
echo built
