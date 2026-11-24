#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m43e (tile «تعرفه و سهم پزشکان» opens on per-doctor shares; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43e/patch-m43e.mjs" "$IR/iran-worker-m44a.mjs" "$IR/iran-worker-m43e.mjs"
node "$W/m43e/patch-m43e.mjs" "$CF/cf-m44a.mjs" "$CF/cf-m43e.mjs"
node --check "$IR/iran-worker-m43e.mjs"; node --check "$CF/cf-m43e.mjs"
md5sum "$IR/iran-worker-m43e.mjs" "$CF/cf-m43e.mjs"
sed -e 's/m44a/m43e/g' "$IR/deploy-m44a.sh" > "$IR/deploy-m43e.sh"; head -2 "$IR/deploy-m43e.sh"
sed -e 's/m44a/m43e/g' "$W/m44a/check-m44a.sh" > "$W/m43e/check-m43e.sh"
sed -e 's/m44a/m43e/g' "$W/m44a/pub-m44a.sh" > "$W/m43e/pub-m43e.sh"
echo built
