#!/bin/bash
# builds m43c (manager cartable: patient tariffs + doctor shares, per-brand surgery rows; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43c/patch-m43c.mjs" "$IR/iran-worker-m43b.mjs" "$IR/iran-worker-m43c.mjs"
node "$W/m43c/patch-m43c.mjs" "$CF/cf-m43b.mjs" "$CF/cf-m43c.mjs"
node --check "$IR/iran-worker-m43c.mjs"; node --check "$CF/cf-m43c.mjs"
md5sum "$IR/iran-worker-m43c.mjs" "$CF/cf-m43c.mjs"
sed -e 's/m43b/m43c/g' "$IR/deploy-m43b.sh" > "$IR/deploy-m43c.sh"; head -2 "$IR/deploy-m43c.sh"
sed -e 's/m43b/m43c/g' "$W/m43b/check-m43b.sh" > "$W/m43c/check-m43c.sh"
sed -e 's/m43b/m43c/g' "$W/m43b/pub-m43b.sh" > "$W/m43c/pub-m43c.sh"
echo built
