#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m53b (server only: the «nodis» task closes 60 days after surgery; «pweek» closes when 30 days overdue) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m53b/patch-m53b.mjs" "$IR/iran-worker-m53a.mjs" "$IR/iran-worker-m53b.mjs"
node "$W/m53b/patch-m53b.mjs" "$CF/cf-m53a.mjs" "$CF/cf-m53b.mjs"
node --check "$IR/iran-worker-m53b.mjs"; node --check "$CF/cf-m53b.mjs"
md5sum "$IR/iran-worker-m53b.mjs" "$CF/cf-m53b.mjs"
sed -e 's/m53a/m53b/g' "$IR/deploy-m53a.sh" > "$IR/deploy-m53b.sh"; head -2 "$IR/deploy-m53b.sh"
sed -e 's/m53a/m53b/g' "$W/m53a/check-m53a.sh" > "$W/m53b/check-m53b.sh"
sed -e 's/m53a/m53b/g' "$W/m53a/pub-m53a.sh" > "$W/m53b/pub-m53b.sh"
echo built
