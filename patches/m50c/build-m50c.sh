#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m50c (surgery sheet: «فیل اولیه» moved to the out-of-plan list; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m50c/patch-m50c.mjs" "$IR/iran-worker-m50b.mjs" "$IR/iran-worker-m50c.mjs"
node "$W/m50c/patch-m50c.mjs" "$CF/cf-m50b.mjs" "$CF/cf-m50c.mjs"
node --check "$IR/iran-worker-m50c.mjs"; node --check "$CF/cf-m50c.mjs"
md5sum "$IR/iran-worker-m50c.mjs" "$CF/cf-m50c.mjs"
sed -e 's/m50b/m50c/g' "$IR/deploy-m50b.sh" > "$IR/deploy-m50c.sh"; head -2 "$IR/deploy-m50c.sh"
sed -e 's/m50b/m50c/g' "$W/m50b/check-m50b.sh" > "$W/m50c/check-m50c.sh"
sed -e 's/m50b/m50c/g' "$W/m50b/pub-m50b.sh" > "$W/m50c/pub-m50c.sh"
echo built
