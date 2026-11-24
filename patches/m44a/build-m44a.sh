#!/bin/bash
# builds m44a (surgery sheet: early failure + implant on one tooth = two fixtures; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m44a/patch-m44a.mjs" "$IR/iran-worker-m43d.mjs" "$IR/iran-worker-m44a.mjs"
node "$W/m44a/patch-m44a.mjs" "$CF/cf-m43d.mjs" "$CF/cf-m44a.mjs"
node --check "$IR/iran-worker-m44a.mjs"; node --check "$CF/cf-m44a.mjs"
md5sum "$IR/iran-worker-m44a.mjs" "$CF/cf-m44a.mjs"
sed -e 's/m43d/m44a/g' "$IR/deploy-m43d.sh" > "$IR/deploy-m44a.sh"; head -2 "$IR/deploy-m44a.sh"
sed -e 's/m43d/m44a/g' "$W/m43d/check-m43d.sh" > "$W/m44a/check-m44a.sh"
sed -e 's/m43d/m44a/g' "$W/m43d/pub-m43d.sh" > "$W/m44a/pub-m44a.sh"
echo built
