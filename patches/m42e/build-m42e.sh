#!/bin/bash
# builds m42e (surgery session dated by the server when the tablet clock is wrong; server only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m42e/patch-m42e.mjs" "$IR/iran-worker-m42d.mjs" "$IR/iran-worker-m42e.mjs"
node "$W/m42e/patch-m42e.mjs" "$CF/cf-m42d.mjs" "$CF/cf-m42e.mjs"
node --check "$IR/iran-worker-m42e.mjs"; node --check "$CF/cf-m42e.mjs"
md5sum "$IR/iran-worker-m42e.mjs" "$CF/cf-m42e.mjs"
sed -e 's/m42d/m42e/g' "$IR/deploy-m42d.sh" > "$IR/deploy-m42e.sh"; head -2 "$IR/deploy-m42e.sh"
sed -e 's/m42d/m42e/g' "$W/m42d/check-m42d.sh" > "$W/m42e/check-m42e.sh"
sed -e 's/m42d/m42e/g' "$W/m42d/pub-m42d.sh" > "$W/m42e/pub-m42e.sh"
echo built
