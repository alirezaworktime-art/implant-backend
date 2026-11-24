#!/bin/bash
# builds m43a (special implant rows priced by their own brand; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43a/patch-m43a.mjs" "$IR/iran-worker-m42e.mjs" "$IR/iran-worker-m43a.mjs"
node "$W/m43a/patch-m43a.mjs" "$CF/cf-m42e.mjs" "$CF/cf-m43a.mjs"
node --check "$IR/iran-worker-m43a.mjs"; node --check "$CF/cf-m43a.mjs"
md5sum "$IR/iran-worker-m43a.mjs" "$CF/cf-m43a.mjs"
sed -e 's/m42e/m43a/g' "$IR/deploy-m42e.sh" > "$IR/deploy-m43a.sh"; head -2 "$IR/deploy-m43a.sh"
sed -e 's/m42e/m43a/g' "$W/m42e/check-m42e.sh" > "$W/m43a/check-m43a.sh"
sed -e 's/m42e/m43a/g' "$W/m42e/pub-m42e.sh" > "$W/m43a/pub-m43a.sh"
echo built
