#!/bin/bash
# builds m43f (settings: new doctor / staff name chosen from the personal accounts; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43f/patch-m43f.mjs" "$IR/iran-worker-m43e.mjs" "$IR/iran-worker-m43f.mjs"
node "$W/m43f/patch-m43f.mjs" "$CF/cf-m43e.mjs" "$CF/cf-m43f.mjs"
node --check "$IR/iran-worker-m43f.mjs"; node --check "$CF/cf-m43f.mjs"
md5sum "$IR/iran-worker-m43f.mjs" "$CF/cf-m43f.mjs"
sed -e 's/m43e/m43f/g' "$IR/deploy-m43e.sh" > "$IR/deploy-m43f.sh"; head -2 "$IR/deploy-m43f.sh"
sed -e 's/m43e/m43f/g' "$W/m43e/check-m43e.sh" > "$W/m43f/check-m43f.sh"
sed -e 's/m43e/m43f/g' "$W/m43e/pub-m43e.sh" > "$W/m43f/pub-m43f.sh"
echo built
