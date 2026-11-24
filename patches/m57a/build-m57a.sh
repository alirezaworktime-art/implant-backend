#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m57a (All on X Korean; SMS text in the «think» PDF; consultant keeps several patients open) on top of m55a for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m57a/patch-m57a.mjs" "$IR/iran-worker-m55a.mjs" "$IR/iran-worker-m57a.mjs"
node "$W/m57a/patch-m57a.mjs" "$CF/cf-m55a.mjs" "$CF/cf-m57a.mjs"
node --check "$IR/iran-worker-m57a.mjs"; node --check "$CF/cf-m57a.mjs"
md5sum "$IR/iran-worker-m57a.mjs" "$CF/cf-m57a.mjs"
sed -e 's/m55a/m57a/g' "$IR/deploy-m55a.sh" > "$IR/deploy-m57a.sh"; head -2 "$IR/deploy-m57a.sh"
sed -e 's/m55a/m57a/g' "$W/m55a/check-m55a.sh" > "$W/m57a/check-m57a.sh"
sed -e 's/m55a/m57a/g' "$W/m55a/pub-m55a.sh" > "$W/m57a/pub-m57a.sh"
echo built
