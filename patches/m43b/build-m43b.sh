#!/bin/bash
# builds m43b (manager corrects a surgery session on a later day; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43b/patch-m43b.mjs" "$IR/iran-worker-m43a.mjs" "$IR/iran-worker-m43b.mjs"
node "$W/m43b/patch-m43b.mjs" "$CF/cf-m43a.mjs" "$CF/cf-m43b.mjs"
node --check "$IR/iran-worker-m43b.mjs"; node --check "$CF/cf-m43b.mjs"
md5sum "$IR/iran-worker-m43b.mjs" "$CF/cf-m43b.mjs"
sed -e 's/m43a/m43b/g' "$IR/deploy-m43a.sh" > "$IR/deploy-m43b.sh"; head -2 "$IR/deploy-m43b.sh"
sed -e 's/m43a/m43b/g' "$W/m43a/check-m43a.sh" > "$W/m43b/check-m43b.sh"
sed -e 's/m43a/m43b/g' "$W/m43a/pub-m43a.sh" > "$W/m43b/pub-m43b.sh"
echo built
