#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m47a (prosthesis session: «ارسال کار برای لابراتوار» opens the lab work order, no mandatory field; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m47a/patch-m47a.mjs" "$IR/iran-worker-m46c.mjs" "$IR/iran-worker-m47a.mjs"
node "$W/m47a/patch-m47a.mjs" "$CF/cf-m46c.mjs" "$CF/cf-m47a.mjs"
node --check "$IR/iran-worker-m47a.mjs"; node --check "$CF/cf-m47a.mjs"
md5sum "$IR/iran-worker-m47a.mjs" "$CF/cf-m47a.mjs"
sed -e 's/m46c/m47a/g' "$IR/deploy-m46c.sh" > "$IR/deploy-m47a.sh"; head -2 "$IR/deploy-m47a.sh"
sed -e 's/m46c/m47a/g' "$W/m46c/check-m46c.sh" > "$W/m47a/check-m47a.sh"
sed -e 's/m46c/m47a/g' "$W/m46c/pub-m46c.sh" > "$W/m47a/pub-m47a.sh"
echo built
