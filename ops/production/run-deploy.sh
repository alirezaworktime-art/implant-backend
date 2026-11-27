#!/bin/bash
# Starts a production script on the Yazd server as its own process (not tied to the SSH session) and follows its log.
# Same as ops/staging/run-deploy.sh, except: production runs never stop each other (a second one waits; see the scripts),
# and the first stdin line (the Cloudflare API token, may be empty) is handed to the script in a root-only file.
#   bash run-deploy.sh <run-id> [script=deploy-prod.sh] [arg]     the script is copied to /opt/implant/deploy/run/ just before
#   scripts: deploy-prod.sh (deploy), preflight-prod.sh (checks only), rollback-prod.sh code|all (undo the last deploy)
# If the GitHub run is cancelled, only this log-follower stops; the script itself is never cut off halfway.
# Exit code = the script's exit code.
set -uo pipefail
ID=${1:?run id}; SC=${2:-deploy-prod.sh}; ARG=${3:-}
[[ "$ID" =~ ^[A-Za-z0-9._-]{1,100}$ ]] || { echo "bad run id"; exit 2; }
case "$SC" in deploy-prod.sh|preflight-prod.sh|rollback-prod.sh) ;; *) echo "unknown script $SC"; exit 2;; esac
[[ "$ARG" =~ ^[a-z]{0,10}$ ]] || { echo "bad argument"; exit 2; }
R=/opt/implant/deploy/run; L=$R/deploy-$ID.log; C=$R/deploy-$ID.rc
umask 077; IFS= read -r -t 20 TOK || true; printf '%s' "${TOK:-}" > $R/cf-$ID.tok; unset TOK
cp $R/$SC $R/deploy-$ID.sh
setsid bash -c "bash $R/deploy-$ID.sh $ID $ARG; echo \$? > $C" > $L 2>&1 < /dev/null 9>&- &
touch $L; tail -n +1 -f $L & T=$!
for i in $(seq 1 3600); do [ -f $C ] && break; sleep 1; done   # until the script has written its exit code (max 60 min, includes waiting for an earlier run)
sleep 1; kill $T 2>/dev/null; wait $T 2>/dev/null
rm -f $R/cf-$ID.tok
ls -1t $R/deploy-*.log 2>/dev/null | tail -n +31 | while read f; do rm -f "$f" "${f%.log}.rc" "${f%.log}.sh" "${f%.log}.private"; done   # keep the last 30 runs
exit "$(cat $C 2>/dev/null || echo 1)"
