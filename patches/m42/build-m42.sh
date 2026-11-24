#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m42 (staff accounts: several roles, shared password switch) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m42/patch-m42.mjs" "$IR/iran-worker-m41b.mjs" "$IR/iran-worker-m42.mjs"
node "$W/m42/patch-m42.mjs" "$CF/cf-m41b.mjs" "$CF/cf-m42.mjs"
node --check "$IR/iran-worker-m42.mjs"; node --check "$CF/cf-m42.mjs"
md5sum "$IR/iran-worker-m42.mjs" "$CF/cf-m42.mjs"
sed -e 's/m41b/m42/g' "$IR/deploy-m41b.sh" > "$IR/deploy-m42.sh"; head -2 "$IR/deploy-m42.sh"
sed -e 's/m41b/m42/g' "$W/m41b/check-m41b.sh" > "$W/m42/check-m42.sh"
sed -e 's/m41b/m42/g' "$W/m41b/pub-m41b.sh" > "$W/m42/pub-m42.sh"
echo built
