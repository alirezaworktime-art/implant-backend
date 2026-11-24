#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m42b (patient file: plan step in the path, all comments; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m42b/patch-m42b.mjs" "$IR/iran-worker-m42.mjs" "$IR/iran-worker-m42b.mjs"
node "$W/m42b/patch-m42b.mjs" "$CF/cf-m42.mjs" "$CF/cf-m42b.mjs"
node --check "$IR/iran-worker-m42b.mjs"; node --check "$CF/cf-m42b.mjs"
md5sum "$IR/iran-worker-m42b.mjs" "$CF/cf-m42b.mjs"
sed -e 's/m42/m42b/g' "$IR/deploy-m42.sh" > "$IR/deploy-m42b.sh"; head -2 "$IR/deploy-m42b.sh"
sed -e 's/m42/m42b/g' "$W/m42/check-m42.sh" > "$W/m42b/check-m42b.sh"
sed -e 's/m42/m42b/g' "$W/m42/pub-m42.sh" > "$W/m42b/pub-m42b.sh"
echo built
