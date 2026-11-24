#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m46b (reception plan-choice sheet shows the content of every plan; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m46b/patch-m46b.mjs" "$IR/iran-worker-m46a.mjs" "$IR/iran-worker-m46b.mjs"
node "$W/m46b/patch-m46b.mjs" "$CF/cf-m46a.mjs" "$CF/cf-m46b.mjs"
node --check "$IR/iran-worker-m46b.mjs"; node --check "$CF/cf-m46b.mjs"
md5sum "$IR/iran-worker-m46b.mjs" "$CF/cf-m46b.mjs"
sed -e 's/m46a/m46b/g' "$IR/deploy-m46a.sh" > "$IR/deploy-m46b.sh"; head -2 "$IR/deploy-m46b.sh"
sed -e 's/m46a/m46b/g' "$W/m46a/check-m46a.sh" > "$W/m46b/check-m46b.sh"
sed -e 's/m46a/m46b/g' "$W/m46a/pub-m46a.sh" > "$W/m46b/pub-m46b.sh"
echo built
