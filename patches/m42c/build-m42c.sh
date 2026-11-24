#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m42c (floating save bar on phones in the paper-file editor; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m42c/patch-m42c.mjs" "$IR/iran-worker-m42b.mjs" "$IR/iran-worker-m42c.mjs"
node "$W/m42c/patch-m42c.mjs" "$CF/cf-m42b.mjs" "$CF/cf-m42c.mjs"
node --check "$IR/iran-worker-m42c.mjs"; node --check "$CF/cf-m42c.mjs"
md5sum "$IR/iran-worker-m42c.mjs" "$CF/cf-m42c.mjs"
sed -e 's/m42b/m42c/g' "$IR/deploy-m42b.sh" > "$IR/deploy-m42c.sh"; head -2 "$IR/deploy-m42c.sh"
sed -e 's/m42b/m42c/g' "$W/m42b/check-m42b.sh" > "$W/m42c/check-m42c.sh"
sed -e 's/m42b/m42c/g' "$W/m42b/pub-m42b.sh" > "$W/m42c/pub-m42c.sh"
echo built
