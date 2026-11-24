#!/bin/bash
# builds m50e (surgery day implant window keeps the last brand picked; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m50e/patch-m50e.mjs" "$IR/iran-worker-m50d.mjs" "$IR/iran-worker-m50e.mjs"
node "$W/m50e/patch-m50e.mjs" "$CF/cf-m50d.mjs" "$CF/cf-m50e.mjs"
node --check "$IR/iran-worker-m50e.mjs"; node --check "$CF/cf-m50e.mjs"
md5sum "$IR/iran-worker-m50e.mjs" "$CF/cf-m50e.mjs"
sed -e 's/m50d/m50e/g' "$IR/deploy-m50d.sh" > "$IR/deploy-m50e.sh"; head -2 "$IR/deploy-m50e.sh"
sed -e 's/m50d/m50e/g' "$W/m50d/check-m50d.sh" > "$W/m50e/check-m50e.sh"
sed -e 's/m50d/m50e/g' "$W/m50d/pub-m50d.sh" > "$W/m50e/pub-m50e.sh"
echo built
