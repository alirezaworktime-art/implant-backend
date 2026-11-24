#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m46c (surgery sheet «سایر خدمات»: teeth, count and doctor per row; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m46c/patch-m46c.mjs" "$IR/iran-worker-m46b.mjs" "$IR/iran-worker-m46c.mjs"
node "$W/m46c/patch-m46c.mjs" "$CF/cf-m46b.mjs" "$CF/cf-m46c.mjs"
node --check "$IR/iran-worker-m46c.mjs"; node --check "$CF/cf-m46c.mjs"
md5sum "$IR/iran-worker-m46c.mjs" "$CF/cf-m46c.mjs"
sed -e 's/m46b/m46c/g' "$IR/deploy-m46b.sh" > "$IR/deploy-m46c.sh"; head -2 "$IR/deploy-m46c.sh"
sed -e 's/m46b/m46c/g' "$W/m46b/check-m46b.sh" > "$W/m46c/check-m46c.sh"
sed -e 's/m46b/m46c/g' "$W/m46b/pub-m46b.sh" > "$W/m46c/pub-m46c.sh"
echo built
