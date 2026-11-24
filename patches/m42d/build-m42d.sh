#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m42d (same-day edit of a surgery session; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m42d/patch-m42d.mjs" "$IR/iran-worker-m42c.mjs" "$IR/iran-worker-m42d.mjs"
node "$W/m42d/patch-m42d.mjs" "$CF/cf-m42c.mjs" "$CF/cf-m42d.mjs"
node --check "$IR/iran-worker-m42d.mjs"; node --check "$CF/cf-m42d.mjs"
md5sum "$IR/iran-worker-m42d.mjs" "$CF/cf-m42d.mjs"
sed -e 's/m42c/m42d/g' "$IR/deploy-m42c.sh" > "$IR/deploy-m42d.sh"; head -2 "$IR/deploy-m42d.sh"
sed -e 's/m42c/m42d/g' "$W/m42c/check-m42c.sh" > "$W/m42d/check-m42d.sh"
sed -e 's/m42c/m42d/g' "$W/m42c/pub-m42c.sh" > "$W/m42d/pub-m42d.sh"
echo built
