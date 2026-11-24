#!/bin/bash
# builds m53a (flow gaps: reception tasks for patients left in a queue or the surgery room, impression held until surgery is finished, task when prosthesis starts before discharge, old post-op follow-ups closed) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m53a/patch-m53a.mjs" "$IR/iran-worker-m52a.mjs" "$IR/iran-worker-m53a.mjs"
node "$W/m53a/patch-m53a.mjs" "$CF/cf-m52a.mjs" "$CF/cf-m53a.mjs"
node --check "$IR/iran-worker-m53a.mjs"; node --check "$CF/cf-m53a.mjs"
md5sum "$IR/iran-worker-m53a.mjs" "$CF/cf-m53a.mjs"
sed -e 's/m52a/m53a/g' "$IR/deploy-m52a.sh" > "$IR/deploy-m53a.sh"; head -2 "$IR/deploy-m53a.sh"
sed -e 's/m52a/m53a/g' "$W/m52a/check-m52a.sh" > "$W/m53a/check-m53a.sh"
sed -e 's/m52a/m53a/g' "$W/m52a/pub-m52a.sh" > "$W/m53a/pub-m53a.sh"
echo built
