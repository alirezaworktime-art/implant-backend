#!/bin/bash
# Starts deploy-prod.sh on the Yazd production server as its own process (not tied to the SSH session) and follows its log.
# Same as ops/staging/run-deploy.sh, except: production deploys never stop each other (a second one waits; see deploy-prod.sh),
# and the first stdin line (the Cloudflare API token, may be empty) is handed to the deploy in a root-only file.
#   bash run-deploy.sh <run-id>        expects /opt/implant/deploy/run/deploy-prod.sh (copied there just before)
# If the GitHub run is cancelled, only this log-follower stops; the deploy itself is never cut off halfway.
# Exit code = the deploy's exit code.
set -uo pipefail
ID=${1:?run id}; [[ "$ID" =~ ^[A-Za-z0-9._-]{1,100}$ ]] || { echo "bad run id"; exit 2; }
R=/opt/implant/deploy/run; L=$R/deploy-$ID.log; C=$R/deploy-$ID.rc
umask 077; IFS= read -r -t 20 TOK || true; printf '%s' "${TOK:-}" > $R/cf-$ID.tok; unset TOK
cp $R/deploy-prod.sh $R/deploy-$ID.sh
setsid bash -c "bash $R/deploy-$ID.sh $ID; echo \$? > $C" > $L 2>&1 < /dev/null 9>&- &
touch $L; tail -n +1 -f $L & T=$!
for i in $(seq 1 3600); do [ -f $C ] && break; sleep 1; done   # until the deploy has written its exit code (max 60 min, includes waiting for an earlier deploy)
sleep 1; kill $T 2>/dev/null; wait $T 2>/dev/null
rm -f $R/cf-$ID.tok
ls -1t $R/deploy-*.log 2>/dev/null | tail -n +31 | while read f; do rm -f "$f" "${f%.log}.rc" "${f%.log}.sh" "${f%.log}.private"; done   # keep the last 30 runs
exit "$(cat $C 2>/dev/null || echo 1)"
