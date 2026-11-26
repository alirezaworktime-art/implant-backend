#!/bin/bash
# Build and deploy the staging copy from the three public repos (run as root on the staging server).
#   bash deploy-staging.sh [branch]        default branch: staging (all three repos)
# Same steps as a production deploy: build → node --check → no import key → back up the database and the running
# worker → install → restart → health, page marker, counts before/after. Rolls back the worker if unhealthy.
# GitHub Actions runs this over SSH on every push to a 'staging' branch; it can also be run by hand.
set -euo pipefail
BR=${1:-staging}; S=/opt/implant-staging; N=$S/node/bin/node; GH=https://github.com/alirezaworktime-art
exec 9>$S/run/deploy.lock; flock -w 600 9 || { echo "another staging deploy is running"; exit 1; }
TS=$(date +%Y%m%d-%H%M%S)

for r in impyar-backend impyar-frontend impyar-tablet; do
  d=$S/src/$r
  [ -d $d/.git ] || git clone -q $GH/$r.git $d
  git -C $d fetch -q --prune origin
  git -C $d rev-parse -q --verify origin/$BR >/dev/null || { echo "$r has no branch '$BR'"; exit 1; }
  git -C $d checkout -q -f --detach origin/$BR; git -C $d clean -qfdx -e secrets/
  echo "$r $(git -C $d rev-parse --short HEAD) $(git -C $d log -1 --format=%s | cut -c1-70)"
done
B=$S/src/impyar-backend
mkdir -p $B/secrets; cp $S/secrets/local.mjs $B/secrets/local.mjs; [ -f $S/secrets/code.txt ] && cp $S/secrets/code.txt $B/secrets/code.txt
chmod 600 $B/secrets/*

TAG=stg-$(git -C $B rev-parse --short HEAD)
OUT=$S/backups/worker-$TS.mjs
$N $B/scripts/build-bundle.mjs $S/src/impyar-frontend $S/src/impyar-tablet $OUT --target iran --tag $TAG
$N --check $OUT
grep -q "^const IMPORT_KEY='';" $OUT || { echo "bundle has an import key: refused"; exit 1; }
NEW=$(md5sum $OUT | cut -d' ' -f1); LIVE=$(md5sum $S/app/worker.js 2>/dev/null | cut -d' ' -f1 || true)
echo "built $TAG md5 $NEW (running: ${LIVE:-none})"

install -o implantstg -g implantstg -m 644 $B/ops/iran-server/server.mjs $S/app/server.mjs
DB=$S/data/implant.db
Q="select 'plans',count(*) from plans union all select 'pays',count(*)||'/'||coalesce(sum(amount),0) from pays"
C1=$( [ -f $DB ] && sqlite3 $DB "$Q" 2>/dev/null | tr '\n' ' ' || echo empty)
[ -f $DB ] && echo ".backup $S/backups/db-before-$TS.db" | sqlite3 $DB
[ -f $S/app/worker.js ] && cp $S/app/worker.js $S/backups/worker-before-$TS.js
install -o implantstg -g implantstg -m 644 $OUT $S/app/worker.js
systemctl restart implant-staging; sleep 3
H=$(curl -s -m 10 http://127.0.0.1:8788/health || true); M=$(curl -s -m 10 http://127.0.0.1:8788/ | grep -c -- "---------- $TAG (" || true)
if [ "$(systemctl is-active implant-staging)" != active ] || [ -z "$H" ] || [ "$M" = 0 ]; then
  echo "NOT HEALTHY (service $(systemctl is-active implant-staging), health '${H:0:60}', marker $M)"
  if [ -f $S/backups/worker-before-$TS.js ]; then install -o implantstg -g implantstg -m 644 $S/backups/worker-before-$TS.js $S/app/worker.js; systemctl restart implant-staging; echo "rolled back"; fi
  exit 1
fi
C2=$(sqlite3 $DB "$Q" 2>/dev/null | tr '\n' ' ' || true)
echo "counts before: $C1"; echo "counts after:  $C2"; [ "$C1" = "$C2" ] || [ "$C1" = empty ] && echo "COUNTS SAME" || echo "COUNTS DIFFER — check"
ls -1t $S/backups/worker-2*.mjs 2>/dev/null | tail -n +11 | xargs -r rm -f   # keep the last 10 builds
for r in impyar-backend impyar-frontend impyar-tablet; do printf '%s ' "$(git -C $S/src/$r rev-parse HEAD)"; done | sed 's/ $//' > $S/run/deployed.txt   # read by the 10-minute check
echo "live md5: $(md5sum $S/app/worker.js | cut -d' ' -f1) | marker: $TAG | health: ${H:0:60}"
echo STAGING-DEPLOY-DONE
