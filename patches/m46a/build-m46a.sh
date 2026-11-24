#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m46a (reception: direct referral to surgery from the work list; brand of the patient in the plan summary; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m46a/patch-m46a.mjs" "$IR/iran-worker-m45b.mjs" "$IR/iran-worker-m46a.mjs"
node "$W/m46a/patch-m46a.mjs" "$CF/cf-m45b.mjs" "$CF/cf-m46a.mjs"
node --check "$IR/iran-worker-m46a.mjs"; node --check "$CF/cf-m46a.mjs"
md5sum "$IR/iran-worker-m46a.mjs" "$CF/cf-m46a.mjs"
sed -e 's/m45b/m46a/g' "$IR/deploy-m45b.sh" > "$IR/deploy-m46a.sh"; head -2 "$IR/deploy-m46a.sh"
sed -e 's/m45b/m46a/g' "$W/m45b/check-m45b.sh" > "$W/m46a/check-m46a.sh"
sed -e 's/m45b/m46a/g' "$W/m45b/pub-m45b.sh" > "$W/m46a/pub-m46a.sh"
echo built
