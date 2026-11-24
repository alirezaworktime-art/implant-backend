#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m50d (surgery day defaults: last session ticked, numbness call unticked; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m50d/patch-m50d.mjs" "$IR/iran-worker-m50c.mjs" "$IR/iran-worker-m50d.mjs"
node "$W/m50d/patch-m50d.mjs" "$CF/cf-m50c.mjs" "$CF/cf-m50d.mjs"
node --check "$IR/iran-worker-m50d.mjs"; node --check "$CF/cf-m50d.mjs"
md5sum "$IR/iran-worker-m50d.mjs" "$CF/cf-m50d.mjs"
sed -e 's/m50c/m50d/g' "$IR/deploy-m50c.sh" > "$IR/deploy-m50d.sh"; head -2 "$IR/deploy-m50d.sh"
sed -e 's/m50c/m50d/g' "$W/m50c/check-m50c.sh" > "$W/m50d/check-m50d.sh"
sed -e 's/m50c/m50d/g' "$W/m50c/pub-m50c.sh" > "$W/m50d/pub-m50d.sh"
echo built
