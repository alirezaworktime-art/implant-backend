#!/bin/bash
# builds m43g (patient file: implant cost split by brand in the timeline; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43g/patch-m43g.mjs" "$IR/iran-worker-m44b.mjs" "$IR/iran-worker-m43g.mjs"
node "$W/m43g/patch-m43g.mjs" "$CF/cf-m44b.mjs" "$CF/cf-m43g.mjs"
node --check "$IR/iran-worker-m43g.mjs"; node --check "$CF/cf-m43g.mjs"
md5sum "$IR/iran-worker-m43g.mjs" "$CF/cf-m43g.mjs"
sed -e 's/m44b/m43g/g' "$IR/deploy-m44b.sh" > "$IR/deploy-m43g.sh"; head -2 "$IR/deploy-m43g.sh"
sed -e 's/m44b/m43g/g' "$W/m44b/check-m44b.sh" > "$W/m43g/check-m43g.sh"
sed -e 's/m44b/m43g/g' "$W/m44b/pub-m44b.sh" > "$W/m43g/pub-m43g.sh"
echo built
