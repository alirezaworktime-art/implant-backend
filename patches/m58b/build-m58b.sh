#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m58b (the lab order from the prosthesis card: nothing mandatory) on top of m58a. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m58b/patch-m58b.mjs" "$IR/iran-worker-m58a.mjs" "$IR/iran-worker-m58b.mjs"
node "$W/m58b/patch-m58b.mjs" "$CF/cf-m58a.mjs" "$CF/cf-m58b.mjs"
node --check "$IR/iran-worker-m58b.mjs"; node --check "$CF/cf-m58b.mjs"
md5sum "$IR/iran-worker-m58b.mjs" "$CF/cf-m58b.mjs"
sed -e 's/m58a/m58b/g' "$IR/deploy-m58a.sh" > "$IR/deploy-m58b.sh"; head -2 "$IR/deploy-m58b.sh"
sed -e 's/m58a/m58b/g' "$W/m58a/check-m58a.sh" > "$W/m58b/check-m58b.sh"
sed -e 's/m58a/m58b/g' "$W/m58a/pub-m58a.sh" > "$W/m58b/pub-m58b.sh"
echo built
