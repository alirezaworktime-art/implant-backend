#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m50b (reception changes the way of payment; «پزشک کلینیک» assistant; referral to another doctor in the plan; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m50b/patch-m50b.mjs" "$IR/iran-worker-m50a.mjs" "$IR/iran-worker-m50b.mjs"
node "$W/m50b/patch-m50b.mjs" "$CF/cf-m50a.mjs" "$CF/cf-m50b.mjs"
node --check "$IR/iran-worker-m50b.mjs"; node --check "$CF/cf-m50b.mjs"
md5sum "$IR/iran-worker-m50b.mjs" "$CF/cf-m50b.mjs"
sed -e 's/m50a/m50b/g' "$IR/deploy-m50a.sh" > "$IR/deploy-m50b.sh"; head -2 "$IR/deploy-m50b.sh"
sed -e 's/m50a/m50b/g' "$W/m50a/check-m50a.sh" > "$W/m50b/check-m50b.sh"
sed -e 's/m50a/m50b/g' "$W/m50a/pub-m50a.sh" > "$W/m50b/pub-m50b.sh"
echo built
