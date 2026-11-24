#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m50a (reception task for the general-dentist consult, open amount on the discharge card, difference settlement form; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m50a/patch-m50a.mjs" "$IR/iran-worker-m49a.mjs" "$IR/iran-worker-m50a.mjs"
node "$W/m50a/patch-m50a.mjs" "$CF/cf-m49a.mjs" "$CF/cf-m50a.mjs"
node --check "$IR/iran-worker-m50a.mjs"; node --check "$CF/cf-m50a.mjs"
md5sum "$IR/iran-worker-m50a.mjs" "$CF/cf-m50a.mjs"
sed -e 's/m49a/m50a/g' "$IR/deploy-m49a.sh" > "$IR/deploy-m50a.sh"; head -2 "$IR/deploy-m50a.sh"
sed -e 's/m49a/m50a/g' "$W/m49a/check-m49a.sh" > "$W/m50a/check-m50a.sh"
sed -e 's/m49a/m50a/g' "$W/m49a/pub-m49a.sh" > "$W/m50a/pub-m50a.sh"
echo built
