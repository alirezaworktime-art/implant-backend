#!/bin/bash
# Starts deploy-staging.sh on the staging server as its own process (not tied to the SSH session) and follows its log.
#   bash run-deploy.sh <run-id>        expects /opt/implant-staging/run/deploy-staging.sh (copied there just before)
# If the GitHub run is cancelled, only this log-follower stops; the deploy itself is never cut off halfway. A newer
# deploy stops an older one safely (see deploy-staging.sh). Exit code = the deploy's exit code.
set -uo pipefail
ID=${1:?run id}; R=/opt/implant-staging/run; L=$R/deploy-$ID.log; C=$R/deploy-$ID.rc
cp $R/deploy-staging.sh $R/deploy-$ID.sh
setsid bash -c "bash $R/deploy-$ID.sh staging; echo \$? > $C" > $L 2>&1 < /dev/null &
touch $L; tail -n +1 -f $L & T=$!
for i in $(seq 1 2400); do [ -f $C ] && break; sleep 1; done   # until the deploy has written its exit code (max 40 min)
sleep 1; kill $T 2>/dev/null; wait $T 2>/dev/null
RC=$(cat $C 2>/dev/null || echo 1)
ls -1t $R/deploy-*.log 2>/dev/null | tail -n +31 | while read f; do rm -f "$f" "${f%.log}.rc" "${f%.log}.sh"; done   # keep the last 30 runs
if [ "$RC" = 143 ]; then echo "SUPERSEDED: a newer push took over this deploy (not an error)"; exit 0; fi
exit $RC
