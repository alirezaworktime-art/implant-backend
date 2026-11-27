#!/bin/bash
# The only command the GitHub production deploy key may run (forced command in root's authorized_keys, see setup-prod.sh).
#   ssh prod "deploy <run-id>"     first stdin line = Cloudflare API token (may be empty)
#   ssh prod "status"              last deploy result
# It never runs a script sent over SSH: it takes ops/production/deploy-prod.sh and cf-put.mjs from the protected
# 'production' branch of impyar-backend (fetched here), starts the deploy as its own process (a cancelled GitHub run never
# cuts it off halfway) and follows its public log. Exit code = the deploy's exit code.
set -uo pipefail
D=$(dirname "$(readlink -f "$0")"); R=$D/run; GH=https://github.com/alirezaworktime-art
read -r CMD ID REST <<<"${SSH_ORIGINAL_COMMAND:-}"
case "${CMD:-}" in
  status) ls -1t $R/deploy-*.log 2>/dev/null | head -1 | xargs -r tail -n 5; exit 0 ;;
  deploy) [[ "${ID:-}" =~ ^[A-Za-z0-9._-]{1,100}$ ]] || { echo "usage: deploy <run-id>"; exit 2; } ;;
  *) echo "allowed: deploy <run-id> | status"; exit 2 ;;
esac
mkdir -p $R; chmod 700 $R
IFS= read -r -t 20 TOK || true
umask 077; printf '%s' "${TOK:-}" > $R/cf-$ID.tok; unset TOK
B=$D/src/impyar-backend; GB=$(grep -oE '^GATE_BRANCH=[A-Za-z0-9._-]+$' $D/deploy.conf 2>/dev/null | tail -1 | cut -d= -f2); GB=${GB:-production}   # deploy.conf: tests only
[ -d $B/.git ] || git clone -q $GH/impyar-backend.git $B
git -C $B fetch -q --prune origin || { echo "cannot fetch impyar-backend"; rm -f $R/cf-$ID.tok; exit 1; }
git -C $B show origin/$GB:ops/production/deploy-prod.sh > $R/deploy-$ID.sh 2>/dev/null && [ -s $R/deploy-$ID.sh ] \
  || { echo "impyar-backend '$GB' has no ops/production/deploy-prod.sh"; rm -f $R/cf-$ID.tok; exit 1; }
git -C $B show origin/$GB:ops/production/cf-put.mjs > $R/cf-put.mjs 2>/dev/null || true
L=$R/deploy-$ID.log; C=$R/deploy-$ID.rc; rm -f $C
setsid bash -c "bash $R/deploy-$ID.sh $ID; echo \$? > $C" > $L 2>&1 < /dev/null &
touch $L; tail -n +1 -f $L & T=$!
for i in $(seq 1 3600); do [ -f $C ] && break; sleep 1; done   # max 60 min (includes waiting for an earlier deploy)
sleep 1; kill $T 2>/dev/null; wait $T 2>/dev/null
ls -1t $R/deploy-*.log 2>/dev/null | tail -n +31 | while read f; do rm -f "$f" "${f%.log}.rc" "${f%.log}.sh" "${f%.log}.private"; done   # keep the last 30 runs
exit "$(cat $C 2>/dev/null || echo 1)"
