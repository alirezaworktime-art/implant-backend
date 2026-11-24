#!/bin/bash
# builds m54b (settlement of a surgery cost difference only in reception's cartable) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m54b/patch-m54b.mjs" "$IR/iran-worker-m54a.mjs" "$IR/iran-worker-m54b.mjs"
node "$W/m54b/patch-m54b.mjs" "$CF/cf-m54a.mjs" "$CF/cf-m54b.mjs"
node --check "$IR/iran-worker-m54b.mjs"; node --check "$CF/cf-m54b.mjs"
md5sum "$IR/iran-worker-m54b.mjs" "$CF/cf-m54b.mjs"
sed -e 's/m54a/m54b/g' "$IR/deploy-m54a.sh" > "$IR/deploy-m54b.sh"; head -2 "$IR/deploy-m54b.sh"
sed -e 's/m54a/m54b/g' "$W/m54a/check-m54a.sh" > "$W/m54b/check-m54b.sh"
sed -e 's/m54a/m54b/g' "$W/m54a/pub-m54a.sh" > "$W/m54b/pub-m54b.sh"
echo built
