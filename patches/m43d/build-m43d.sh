#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m43d (temporary prosthesis: PMMA by tooth, Essix and denture by jaw, own tariffs; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m43d/patch-m43d.mjs" "$IR/iran-worker-m43c.mjs" "$IR/iran-worker-m43d.mjs"
node "$W/m43d/patch-m43d.mjs" "$CF/cf-m43c.mjs" "$CF/cf-m43d.mjs"
node --check "$IR/iran-worker-m43d.mjs"; node --check "$CF/cf-m43d.mjs"
md5sum "$IR/iran-worker-m43d.mjs" "$CF/cf-m43d.mjs"
sed -e 's/m43c/m43d/g' "$IR/deploy-m43c.sh" > "$IR/deploy-m43d.sh"; head -2 "$IR/deploy-m43d.sh"
sed -e 's/m43c/m43d/g' "$W/m43c/check-m43c.sh" > "$W/m43d/check-m43d.sh"
sed -e 's/m43c/m43d/g' "$W/m43c/pub-m43c.sh" > "$W/m43d/pub-m43d.sh"
echo built
