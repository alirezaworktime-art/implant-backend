#!/bin/bash
# Production deploy on the Yazd server (root; started by gate.sh, which GitHub Actions calls on every push to 'production').
#   bash deploy-prod.sh <run-id>
# Builds the 'production' branches of the three repos on this server (secrets stay here), then the same steps as every
# earlier release: node --check → no import key → online database backup (checked) → worker backup → install → restart →
# health, page marker, md5 → no row of the backup missing in the live database (plans, payments …) → rollback if anything
# fails → keep the last 10 deploy backups. Then the Cloudflare copy (built here, uploaded from here, checked, rolled back if bad).
# The GitHub log is public: it shows only OK/FAILED and check names. Counts and amounts go to run/deploy-<id>.private here.
# Database: missing on the very first deploy → the server creates an empty one on start; missing later → stop, service stopped.
# Tables are created/extended by the server itself on start (CREATE TABLE IF NOT EXISTS / ADD COLUMN; no migration tool).
# Deploys never cancel each other: a second one waits for the first (lock), and commits already live are not deployed again.
set -euo pipefail
ID=${1:?run id}
D=${DEPLOY_ROOT:-$(dirname "$(readlink -f "$0")")/..}; D=$(readlink -f $D)
[ -f $D/deploy.conf ] && . $D/deploy.conf          # only for tests on another server; production uses the defaults below
APP=${APP:-/opt/implant/app}; DB=${DB:-/opt/implant/data/implant.db}; BK=${BK:-/opt/implant/backups}
SVC=${SVC:-implant}; PORT=${PORT:-8787}; RUN_USER=${RUN_USER:-implant}; N=${NODE:-/usr/bin/node}
BRANCH=${BRANCH:-production}; CF=${CF:-1}; CF_URL=${CF_URL:-https://implant-api.implant-yazd.workers.dev}; KEEP=${KEEP:-10}
GH=https://github.com/alirezaworktime-art; R=$D/run; OUTD=$D/builds
mkdir -p $R $OUTD $BK; chmod 700 $R $OUTD
PRIV=$R/deploy-$ID.private; umask 077; : > $PRIV
p() { printf '%s\n' "$*" >> $PRIV; }
TOKF=$R/cf-$ID.tok; TOK=$(cat $TOKF 2>/dev/null || true); rm -f $TOKF
fail() { echo "FAILED: $*"; p "FAILED: $*"; exit 1; }
trap '' TERM HUP INT     # production deploys are never stopped halfway
echo "== production deploy $ID ($(date '+%F %T'))"
exec 9>$R/deploy.lock
flock -n 9 || { echo "another production deploy is running: waiting for it (max 30 min)"; flock -w 1800 9 || fail "the other deploy did not finish in 30 min"; }

# ---- 1. sources (nothing on the server changes in this step)
for r in impyar-backend impyar-frontend impyar-tablet; do
  d=$D/src/$r; v=BR_${r#impyar-}; b=${!v:-$BRANCH}
  [ -d $d/.git ] || git clone -q $GH/$r.git $d
  git -C $d fetch -q --prune origin || fail "cannot fetch $r"
  git -C $d rev-parse -q --verify origin/$b >/dev/null || fail "$r has no branch '$b'"
  git -C $d checkout -q -f --detach origin/$b; git -C $d clean -qfdx -e secrets/
  echo "$r $b $(git -C $d rev-parse --short HEAD) $(git -C $d log -1 --format=%s | cut -c1-70)"
done
FE=$D/src/impyar-frontend; B=$D/src/impyar-backend; TB=$D/src/impyar-tablet
[ -f $FE/tools/build.mjs ] && [ -f $FE/tools/assets.mjs ] || fail "impyar-frontend has no tools/build.mjs + tools/assets.mjs (older than the src/ layout): merge staging into its production first"
[ -s $TB/dist/implant-plan.apk ] || fail "impyar-tablet has no dist/implant-plan.apk"
$N $FE/tools/build.mjs --check >/dev/null 2>&1 || { echo "impyar-frontend: committed pages differ from src/ — rebuilding them from src/"; $N $FE/tools/build.mjs >/dev/null; }
HEADS=$(for r in impyar-backend impyar-frontend impyar-tablet; do printf '%s ' "$(git -C $D/src/$r rev-parse HEAD)"; done | sed 's/ $//')
FIRST=0; [ -f $R/deployed.txt ] || FIRST=1
DO_IRAN=1; DO_CF=$CF
[ "${FORCE:-0}" != 1 ] && [ "$HEADS" = "$(cat $R/deployed.txt 2>/dev/null)" ] && DO_IRAN=0
[ "${FORCE:-0}" != 1 ] && [ "$CF" = 1 ] && [ "$HEADS" = "$(cat $R/cf-deployed.txt 2>/dev/null)" ] && DO_CF=0
if [ $DO_IRAN = 0 ] && [ $DO_CF = 0 ]; then echo "production already runs exactly these commits: nothing to do"; echo PROD-DEPLOY-DONE; exit 0; fi

# ---- 2. database present?
NEWDB=0
if [ ! -f $DB ]; then
  if [ $FIRST = 1 ]; then echo "first deploy and no database: the server creates an empty one on start"; NEWDB=1
  else systemctl stop $SVC || true; fail "the production database is missing and this is not the first deploy: service '$SVC' stopped so it cannot create an empty one. Restore the database (latest backup in $BK), start the service, then run the deploy again"; fi
fi

# ---- 3. build (secrets only on this server)
mkdir -p $B/secrets; for f in local.mjs code.txt; do [ -f $D/secrets/$f ] && cp $D/secrets/$f $B/secrets/$f; done; chmod 600 $B/secrets/* 2>/dev/null || true
[ -f $B/secrets/local.mjs ] || fail "no $D/secrets/local.mjs on this server (nobody could log in)"
TS=$(date +%Y%m%d-%H%M%S); TAG=prod-$(git -C $B rev-parse --short HEAD)
OUT=$OUTD/iran-$TS-$TAG.mjs; COUT=$OUTD/cf-$TS-$TAG.mjs
$N $B/scripts/build-bundle.mjs $FE $TB $OUT --target iran --tag $TAG >/dev/null || fail "build (Yazd) failed"
$N --check $OUT || fail "node --check (Yazd bundle)"
grep -q "^const IMPORT_KEY='';" $OUT || fail "the Yazd bundle has an import key: refused"
[ "$(stat -c %s $OUT)" -gt 2000000 ] || fail "the Yazd bundle is too small"
if [ $DO_CF = 1 ]; then
  $N $B/scripts/build-bundle.mjs $FE $TB $COUT --target cloudflare --tag $TAG >/dev/null || fail "build (Cloudflare) failed"
  $N --check $COUT || fail "node --check (Cloudflare bundle)"
  grep -qE "^const IMPORT_KEY='[^']+';" $COUT || fail "the Cloudflare bundle has no import key (the nightly copy needs it)"
fi
NEW=$(md5sum $OUT | cut -d' ' -f1); LIVE=$(md5sum $APP/worker.js 2>/dev/null | cut -d' ' -f1 || true)
echo "built $TAG md5 $NEW (running: ${LIVE:-none})"

health() { # service up, /health answers, page has the marker
  local i h m; for i in $(seq 1 30); do
    h=$(curl -s -m 10 http://127.0.0.1:$PORT/health || true)
    if [ "$(systemctl is-active $SVC)" = active ] && [ -n "$h" ]; then m=$(curl -s -m 20 http://127.0.0.1:$PORT/ | grep -c -- "---------- $1 (" || true); [ "$m" -gt 0 ] && return 0; fi
    sleep 1; done; return 1; }
if [ $DO_IRAN = 1 ]; then
  # ---- 4. backups: database (online, checked) and running worker
  BDB=$BK/deploy-$TAG-$TS.db; WB=$BK/worker-before-$TAG-$TS.js
  if [ $NEWDB = 0 ]; then
    sqlite3 $DB ".backup '$BDB'" || fail "database backup failed"
    sqlite3 $BDB "pragma journal_mode=delete" >/dev/null || fail "database backup: journal mode"   # one self-contained file (no -wal/-shm)
    [ "$(sqlite3 -readonly $BDB 'pragma quick_check' 2>&1)" = ok ] || fail "the database backup does not pass quick_check"
    p "db backup $BDB $(du -h $BDB | cut -f1)"; echo "database backed up and checked (quick_check ok)"
  fi
  [ -f $APP/worker.js ] && cp $APP/worker.js $WB
  # ---- 5. install → restart → health (rollback if not healthy)
  if [ -f $B/ops/iran-server/server.mjs ] && ! cmp -s $B/ops/iran-server/server.mjs $APP/server.mjs; then
    [ -f $APP/server.mjs ] && cp $APP/server.mjs $BK/server-before-$TAG-$TS.mjs
    install -o $RUN_USER -g $RUN_USER -m 644 $B/ops/iran-server/server.mjs $APP/server.mjs; echo "server.mjs updated"; fi
  rollback() {
    echo "ROLLING BACK: $1"
    if [ -f $WB ]; then install -o $RUN_USER -g $RUN_USER -m 644 $WB $APP/worker.js
      [ -f $BK/server-before-$TAG-$TS.mjs ] && install -o $RUN_USER -g $RUN_USER -m 644 $BK/server-before-$TAG-$TS.mjs $APP/server.mjs
      systemctl restart $SVC; sleep 3
      [ "$(md5sum $APP/worker.js | cut -d' ' -f1)" = "$LIVE" ] && curl -s -m 10 -o /dev/null http://127.0.0.1:$PORT/health && echo "rolled back: the previous version runs again" || echo "ROLLBACK NOT CONFIRMED — check the server now"
    else echo "no previous worker to roll back to"; fi
    fail "$1"; }
  install -o $RUN_USER -g $RUN_USER -m 644 $OUT $APP/worker.js
  [ "${TEST_BREAK:-0}" = 1 ] && echo "this is not javascript" >> $APP/worker.js   # tests only (deploy.conf), never set on production
  T0=$(date '+%F %T'); systemctl restart $SVC
  health $TAG || rollback "not healthy after restart (service $(systemctl is-active $SVC))"
  [ "$(md5sum $APP/worker.js | cut -d' ' -f1)" = "$NEW" ] || rollback "installed file md5 differs from the build"
  echo "healthy: service active, /health answers, page marker $TAG, md5 ok"
  [ "${TEST_LOSE:-0}" = 1 ] && sqlite3 $DB "delete from pays where id=(select id from pays limit 1)"   # tests only (deploy.conf)
  # ---- 6. data: every row of the backup must still be in the live database (nothing lost)
  if [ $NEWDB = 0 ]; then
    LOST=""; KEYLOST=0
    for t in $(sqlite3 -readonly $BDB "select name from sqlite_master where type='table' and name not like 'sqlite_%'"); do
      sqlite3 -readonly $BDB "select 1 from pragma_table_info('$t') where name='id'" | grep -q 1 || continue
      n=$(sqlite3 -readonly $DB "attach '$BDB' as b; select count(*) from b.\"$t\" x where not exists (select 1 from main.\"$t\" y where y.id=x.id)" 2>/dev/null || echo err)
      [ "$n" = 0 ] && continue; LOST="$LOST $t:$n"; case $t in plans|pays) KEYLOST=1;; esac
    done
    Q="select count(*)||' '||coalesce(sum(amount),0) from pays"
    PB=$(sqlite3 -readonly $BDB "$Q"); PL=$(sqlite3 -readonly $DB "$Q")
    ED=$(sqlite3 -readonly $DB "attach '$BDB' as b; select count(*) from b.pays x join main.pays y on y.id=x.id where coalesce(y.amount,0)<>coalesce(x.amount,0)")
    p "plans backup/live: $(sqlite3 -readonly $BDB 'select count(*) from plans') / $(sqlite3 -readonly $DB 'select count(*) from plans')"
    p "pays count+sum backup: $PB | live: $PL | edited amounts: $ED"
    [ $KEYLOST = 1 ] && rollback "rows of plans/payments from the backup are missing now (${LOST# }) — the backup $BDB has them; if a user deleted them during the deploy, run it again"
    [ -n "$LOST" ] && echo "WARNING: rows missing compared with the backup (may be normal deletes during the deploy):$LOST"
    [ "$ED" = 0 ] || echo "WARNING: $ED payment amount(s) changed during the deploy (users editing) — check"
    echo "data check: no plan or payment lost; payments total $( [ "${PB#* }" = "${PL#* }" ] && echo same || echo changed by new entries)"
  fi
  E=$(journalctl -u $SVC --since "$T0" --no-pager 2>/dev/null | grep -ciE 'error|exception' || true); echo "errors in the service log since restart: $E"
  ls -1t $BK/deploy-*.db 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f || true              # keep the last 10 deploy backups
  ls -1t $BK/worker-before-*.js 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f || true
  ls -1t $BK/server-before-*.mjs 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f || true
  ls -1t $OUTD/iran-*.mjs 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f || true
  printf '%s\n' "$HEADS" > $R/deployed.txt
  echo "YAZD OK: $TAG md5 $NEW"
else echo "Yazd already runs these commits"; fi

# ---- 7. Cloudflare copy (only after Yazd is healthy)
if [ $DO_CF = 1 ]; then
  [ -n "$TOK" ] || fail "Cloudflare: no API token (GitHub secret CF_API_TOKEN) — Yazd is deployed, the Cloudflare copy is not"
  [ -s $D/secrets/cf-account ] || fail "Cloudflare: no $D/secrets/cf-account — Yazd is deployed, the Cloudflare copy is not"
  CB=$OUTD/cf-before-$TS.mjs
  CF_TOKEN=$TOK CF_ACCOUNT=$(cat $D/secrets/cf-account) $N $R/cf-put.mjs get $CB >/dev/null || fail "Cloudflare: could not save the current Cloudflare worker (nothing changed there)"
  CF_TOKEN=$TOK CF_ACCOUNT=$(cat $D/secrets/cf-account) $N $R/cf-put.mjs put $COUT || fail "Cloudflare upload failed (Cloudflare unchanged)"
  ok=0; for i in $(seq 1 12); do h=$(curl -s -m 15 -o /dev/null -w '%{http_code}' $CF_URL/health || true); m=$(curl -s -m 30 $CF_URL/ | grep -c -- "---------- $TAG (" || true); [ "$h" = 200 ] && [ "$m" -gt 0 ] && { ok=1; break; }; sleep 5; done
  if [ $ok = 0 ]; then CF_TOKEN=$TOK CF_ACCOUNT=$(cat $D/secrets/cf-account) $N $R/cf-put.mjs put $CB && echo "Cloudflare rolled back to the previous worker"; fail "Cloudflare not healthy after upload"; fi
  ls -1t $OUTD/cf-*.mjs 2>/dev/null | tail -n +$((2*KEEP+1)) | xargs -r rm -f || true
  printf '%s\n' "$HEADS" > $R/cf-deployed.txt
  echo "CLOUDFLARE OK: $TAG"
fi
unset TOK
echo PROD-DEPLOY-DONE
