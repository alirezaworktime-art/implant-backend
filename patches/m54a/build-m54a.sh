#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m54a (second audit: overdue cheques, late impression in win-back, payok reminder, closing a file, extra patient / surgery fields, follow-up results) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m54a/patch-m54a.mjs" "$IR/iran-worker-m53b.mjs" "$IR/iran-worker-m54a.mjs"
node "$W/m54a/patch-m54a.mjs" "$CF/cf-m53b.mjs" "$CF/cf-m54a.mjs"
node --check "$IR/iran-worker-m54a.mjs"; node --check "$CF/cf-m54a.mjs"
md5sum "$IR/iran-worker-m54a.mjs" "$CF/cf-m54a.mjs"
sed -e 's/m53b/m54a/g' "$IR/deploy-m53b.sh" > "$IR/deploy-m54a.sh"; head -2 "$IR/deploy-m54a.sh"
sed -e 's/m53b/m54a/g' "$W/m53b/check-m53b.sh" > "$W/m54a/check-m54a.sh"
sed -e 's/m53b/m54a/g' "$W/m53b/pub-m53b.sh" > "$W/m54a/pub-m54a.sh"
echo built
