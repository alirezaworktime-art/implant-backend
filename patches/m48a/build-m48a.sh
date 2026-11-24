#!/bin/bash
# builds m48a (page only: money separators, general-dentist consult flag, larger «درمان‌های انتخاب نشده», comments in PDFs, result-sheet bug) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy; here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m48a/patch-m48a.mjs" "$IR/iran-worker-m47a.mjs" "$IR/iran-worker-m48a.mjs"
node "$W/m48a/patch-m48a.mjs" "$CF/cf-m47a.mjs" "$CF/cf-m48a.mjs"
node --check "$IR/iran-worker-m48a.mjs"; node --check "$CF/cf-m48a.mjs"
md5sum "$IR/iran-worker-m48a.mjs" "$CF/cf-m48a.mjs"
sed -e 's/m47a/m48a/g' "$IR/deploy-m47a.sh" > "$IR/deploy-m48a.sh"; head -2 "$IR/deploy-m48a.sh"
sed -e 's/m47a/m48a/g' "$W/m47a/check-m47a.sh" > "$W/m48a/check-m48a.sh"
sed -e 's/m47a/m48a/g' "$W/m47a/pub-m47a.sh" > "$W/m48a/pub-m48a.sh"
echo built
