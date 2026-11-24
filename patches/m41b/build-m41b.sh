#!/bin/bash
# builds m41b (paper file: earlier payments above the cost = patient credit; page + server) for Iran and Cloudflare. Run in Git Bash.
# The patch was built and tested on the sanitized copy (work/m41/m41-clean.mjs); here it is only applied to the real bundles.
set -e
W=/c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
CF=/c/Users/Admin/Desktop/implant/iran-server
node "$W/m41b/patch-m41b.mjs" "$IR/iran-worker-m41.mjs" "$IR/iran-worker-m41b.mjs"
node "$W/m41b/patch-m41b.mjs" "$CF/cf-m41.mjs" "$CF/cf-m41b.mjs"
node --check "$IR/iran-worker-m41b.mjs"; node --check "$CF/cf-m41b.mjs"
md5sum "$IR/iran-worker-m41b.mjs" "$CF/cf-m41b.mjs"
sed -e 's/m41/m41b/g' "$IR/deploy-m41.sh" > "$IR/deploy-m41b.sh"; head -2 "$IR/deploy-m41b.sh"
sed -e 's/m41/m41b/g' "$W/m41/check-m41.sh" > "$W/m41b/check-m41b.sh"
cat > "$W/m41b/pub-m41b.sh" <<'EOS'
#!/bin/bash
IR=/c/Users/Admin/Desktop/implant-cowork/iran-server
cd "$IR" && bash deploy-m41b.sh 2>&1 | grep -viE "token|secret|passw" | tail -12
echo "== CF"
cd /c/Users/Admin/Desktop/implant/iran-server && node cf.mjs put cf-m41b.mjs 2>&1 | grep -viE "token|secret|key" | tail -5
bash /c/Users/Admin/Desktop/implant-cowork/claude-code-kit/work/m41b/check-m41b.sh
EOS
echo built
