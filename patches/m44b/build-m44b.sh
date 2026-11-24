#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m44b (paper files: second fixture after an early failure as its own implant row; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m44b/patch-m44b.mjs" "$IR/iran-worker-m43f.mjs" "$IR/iran-worker-m44b.mjs"
node "$W/m44b/patch-m44b.mjs" "$CF/cf-m43f.mjs" "$CF/cf-m44b.mjs"
node --check "$IR/iran-worker-m44b.mjs"; node --check "$CF/cf-m44b.mjs"
md5sum "$IR/iran-worker-m44b.mjs" "$CF/cf-m44b.mjs"
sed -e 's/m43f/m44b/g' "$IR/deploy-m43f.sh" > "$IR/deploy-m44b.sh"; head -2 "$IR/deploy-m44b.sh"
sed -e 's/m43f/m44b/g' "$W/m43f/check-m43f.sh" > "$W/m44b/check-m44b.sh"
sed -e 's/m43f/m44b/g' "$W/m43f/pub-m43f.sh" > "$W/m44b/pub-m44b.sh"
echo built
