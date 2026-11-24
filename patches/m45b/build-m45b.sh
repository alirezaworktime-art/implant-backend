#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m45b (discharge without the 60-day limit; page + server anchors) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m45b/patch-m45b.mjs" "$IR/iran-worker-m45a.mjs" "$IR/iran-worker-m45b.mjs"
node "$W/m45b/patch-m45b.mjs" "$CF/cf-m45a.mjs" "$CF/cf-m45b.mjs"
node --check "$IR/iran-worker-m45b.mjs"; node --check "$CF/cf-m45b.mjs"
md5sum "$IR/iran-worker-m45b.mjs" "$CF/cf-m45b.mjs"
sed -e 's/m45a/m45b/g' "$IR/deploy-m45a.sh" > "$IR/deploy-m45b.sh"; head -2 "$IR/deploy-m45b.sh"
sed -e 's/m45a/m45b/g' "$W/m45a/check-m45a.sh" > "$W/m45b/check-m45b.sh"
sed -e 's/m45a/m45b/g' "$W/m45a/pub-m45a.sh" > "$W/m45b/pub-m45b.sh"
echo built
