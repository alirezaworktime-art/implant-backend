#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m55a (special implants of the implant row picked from a list, each priced with its own tariff; page only) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m55a/patch-m55a.mjs" "$IR/iran-worker-m54c.mjs" "$IR/iran-worker-m55a.mjs"
node "$W/m55a/patch-m55a.mjs" "$CF/cf-m54c.mjs" "$CF/cf-m55a.mjs"
node --check "$IR/iran-worker-m55a.mjs"; node --check "$CF/cf-m55a.mjs"
md5sum "$IR/iran-worker-m55a.mjs" "$CF/cf-m55a.mjs"
sed -e 's/m54c/m55a/g' "$IR/deploy-m54c.sh" > "$IR/deploy-m55a.sh"; head -2 "$IR/deploy-m55a.sh"
sed -e 's/m54c/m55a/g' "$W/m54c/check-m54c.sh" > "$W/m55a/check-m55a.sh"
sed -e 's/m54c/m55a/g' "$W/m54c/pub-m54c.sh" > "$W/m55a/pub-m55a.sh"
echo built
