#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m59a (the doctor lab order = «یک نگاه», filled from the history) on top of m58b. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m59a/patch-m59a.mjs" "$IR/iran-worker-m58b.mjs" "$IR/iran-worker-m59a.mjs"
node "$W/m59a/patch-m59a.mjs" "$CF/cf-m58b.mjs" "$CF/cf-m59a.mjs"
node --check "$IR/iran-worker-m59a.mjs"; node --check "$CF/cf-m59a.mjs"
md5sum "$IR/iran-worker-m59a.mjs" "$CF/cf-m59a.mjs"
sed -e 's/m58b/m59a/g' "$IR/deploy-m58b.sh" > "$IR/deploy-m59a.sh"; head -2 "$IR/deploy-m59a.sh"
sed -e 's/m58b/m59a/g' "$W/m58b/check-m58b.sh" > "$W/m59a/check-m59a.sh"
sed -e 's/m58b/m59a/g' "$W/m58b/pub-m58b.sh" > "$W/m59a/pub-m59a.sh"
echo built
