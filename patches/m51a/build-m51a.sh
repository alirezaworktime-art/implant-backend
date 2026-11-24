#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# builds m51a (paper files: repeated file number or national id announced while typing; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m51a/patch-m51a.mjs" "$IR/iran-worker-m50e.mjs" "$IR/iran-worker-m51a.mjs"
node "$W/m51a/patch-m51a.mjs" "$CF/cf-m50e.mjs" "$CF/cf-m51a.mjs"
node --check "$IR/iran-worker-m51a.mjs"; node --check "$CF/cf-m51a.mjs"
md5sum "$IR/iran-worker-m51a.mjs" "$CF/cf-m51a.mjs"
sed -e 's/m50e/m51a/g' "$IR/deploy-m50e.sh" > "$IR/deploy-m51a.sh"; head -2 "$IR/deploy-m51a.sh"
sed -e 's/m50e/m51a/g' "$W/m50e/check-m50e.sh" > "$W/m51a/check-m51a.sh"
sed -e 's/m50e/m51a/g' "$W/m50e/pub-m50e.sh" > "$W/m51a/pub-m51a.sh"
echo built
