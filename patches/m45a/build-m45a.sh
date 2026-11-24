#!/bin/bash
# builds m45a (surgery sheet: suture kind, surgical guide, repeated-tooth and far-cost confirmations; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m45a/patch-m45a.mjs" "$IR/iran-worker-m43g.mjs" "$IR/iran-worker-m45a.mjs"
node "$W/m45a/patch-m45a.mjs" "$CF/cf-m43g.mjs" "$CF/cf-m45a.mjs"
node --check "$IR/iran-worker-m45a.mjs"; node --check "$CF/cf-m45a.mjs"
md5sum "$IR/iran-worker-m45a.mjs" "$CF/cf-m45a.mjs"
sed -e 's/m43g/m45a/g' "$IR/deploy-m43g.sh" > "$IR/deploy-m45a.sh"; head -2 "$IR/deploy-m45a.sh"
sed -e 's/m43g/m45a/g' "$W/m43g/check-m43g.sh" > "$W/m45a/check-m45a.sh"
sed -e 's/m43g/m45a/g' "$W/m43g/pub-m43g.sh" > "$W/m45a/pub-m45a.sh"
echo built
