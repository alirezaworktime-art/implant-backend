#!/bin/bash
# builds m61a (prosthesis «ادامه درمان»: stage per tooth, failure choices, next step) on top of m60a. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m61a/patch-m61a.mjs" "$IR/iran-worker-m60a.mjs" "$IR/iran-worker-m61a.mjs"
node "$W/m61a/patch-m61a.mjs" "$CF/cf-m60a.mjs" "$CF/cf-m61a.mjs"
node --check "$IR/iran-worker-m61a.mjs"; node --check "$CF/cf-m61a.mjs"
md5sum "$IR/iran-worker-m61a.mjs" "$CF/cf-m61a.mjs"
sed -e 's/m60a/m61a/g' "$IR/deploy-m60a.sh" > "$IR/deploy-m61a.sh"; head -2 "$IR/deploy-m61a.sh"
sed -e 's/m60a/m61a/g' "$W/m60a/check-m60a.sh" > "$W/m61a/check-m61a.sh"
sed -e 's/m60a/m61a/g' "$W/m60a/pub-m60a.sh" > "$W/m61a/pub-m61a.sh"
echo built
