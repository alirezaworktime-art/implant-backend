#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m60a (surgery day: fixture stock by brand, diameter × length) on top of m59a. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m60a/patch-m60a.mjs" "$IR/iran-worker-m59a.mjs" "$IR/iran-worker-m60a.mjs"
node "$W/m60a/patch-m60a.mjs" "$CF/cf-m59a.mjs" "$CF/cf-m60a.mjs"
node --check "$IR/iran-worker-m60a.mjs"; node --check "$CF/cf-m60a.mjs"
md5sum "$IR/iran-worker-m60a.mjs" "$CF/cf-m60a.mjs"
sed -e 's/m59a/m60a/g' "$IR/deploy-m59a.sh" > "$IR/deploy-m60a.sh"; head -2 "$IR/deploy-m60a.sh"
sed -e 's/m59a/m60a/g' "$W/m59a/check-m59a.sh" > "$W/m60a/check-m60a.sh"
sed -e 's/m59a/m60a/g' "$W/m59a/pub-m59a.sh" > "$W/m60a/pub-m60a.sh"
echo built
