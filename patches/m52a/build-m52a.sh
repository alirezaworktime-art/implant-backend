#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m52a (after surgery: parts settled separately + cash discount only on the surgery part; «منتظر پزشک» until the plan is sent; plan count in the doctor archive) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m52a/patch-m52a.mjs" "$IR/iran-worker-m51a.mjs" "$IR/iran-worker-m52a.mjs"
node "$W/m52a/patch-m52a.mjs" "$CF/cf-m51a.mjs" "$CF/cf-m52a.mjs"
node --check "$IR/iran-worker-m52a.mjs"; node --check "$CF/cf-m52a.mjs"
md5sum "$IR/iran-worker-m52a.mjs" "$CF/cf-m52a.mjs"
sed -e 's/m51a/m52a/g' "$IR/deploy-m51a.sh" > "$IR/deploy-m52a.sh"; head -2 "$IR/deploy-m52a.sh"
sed -e 's/m51a/m52a/g' "$W/m51a/check-m51a.sh" > "$W/m52a/check-m52a.sh"
sed -e 's/m51a/m52a/g' "$W/m51a/pub-m51a.sh" > "$W/m52a/pub-m52a.sh"
echo built
