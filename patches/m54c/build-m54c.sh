#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m54c (the extra fields of m54a taken away; closing a file stays) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m54c/patch-m54c.mjs" "$IR/iran-worker-m54b.mjs" "$IR/iran-worker-m54c.mjs"
node "$W/m54c/patch-m54c.mjs" "$CF/cf-m54b.mjs" "$CF/cf-m54c.mjs"
node --check "$IR/iran-worker-m54c.mjs"; node --check "$CF/cf-m54c.mjs"
md5sum "$IR/iran-worker-m54c.mjs" "$CF/cf-m54c.mjs"
sed -e 's/m54b/m54c/g' "$IR/deploy-m54b.sh" > "$IR/deploy-m54c.sh"; head -2 "$IR/deploy-m54c.sh"
sed -e 's/m54b/m54c/g' "$W/m54b/check-m54b.sh" > "$W/m54c/check-m54c.sh"
sed -e 's/m54b/m54c/g' "$W/m54b/pub-m54b.sh" > "$W/m54c/pub-m54c.sh"
echo built
