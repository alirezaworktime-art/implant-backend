#!/bin/bash
# Build and deploy production from the three public repos (run as root on the Yazd server, alavi.itpelc.ir).
#   bash deploy-prod.sh <run-id>        (started by run-deploy.sh; GitHub Actions runs that over SSH on every push to 'production')
# The same steps as ops/staging/deploy-staging.sh (build → node --check → no import key → back up the database and the
# running worker → install → restart → health, page marker → rollback if unhealthy), with the production guardrails:
#  - deploys never stop each other: a second one waits for the first (lock); and it waits until the 'production' branches of
#    the three repos have stopped changing (merges in two or three repos are deployed together, not one by one)
#  - database: the server is a first install only if no worker was ever installed; otherwise a missing or suddenly empty
#    database stops the deploy, rescues a copy of a database the running server still holds open, and blocks the service
#    from starting (systemctl mask) until the owner restores it
#  - free space checked; database backup online, self-contained, quick_check'ed; worker backup
#  - after restart: health, a page marker unique to this build, md5 — and the data check: every row of every table of the
#    backup (by primary key) must still be there; a lost payment, a lost plan with payments, or a payment amount changed
#    without an edit record rolls back AND blocks further deploys until the owner looks (the backup is kept)
#  - keep the last 10 deploy backups (only files this script made); then the Cloudflare copy: save the running one, upload,
#    check the new marker, roll back and re-check if bad
#  - the GitHub log is public: it shows only steps and OK/FAILED; counts, amounts, table names and tool output go to
#    run/deploy-<id>.private on this server
# Tables are created/extended by the server itself on start (CREATE TABLE IF NOT EXISTS / ADD COLUMN; no migration tool).
set -euo pipefail
ID=${1:?run id}
D=/opt/implant/deploy
[ -f $D/deploy.conf ] && . $D/deploy.conf          # only for tests on another server; production uses the defaults below
APP=${APP:-/opt/implant/app}; DB=${DB:-/opt/implant/data/implant.db}; BK=${BK:-/opt/implant/backups}
SVC=${SVC:-implant}; PORT=${PORT:-8787}; RUN_USER=${RUN_USER:-implant}; N=${NODE:-/usr/bin/node}
BRANCH=${BRANCH:-production}; CF=${CF:-1}; CF_URL=${CF_URL:-https://implant-api.implant-yazd.workers.dev}; KEEP=${KEEP:-10}; STABLE=${STABLE:-120}
GH=https://github.com/alirezaworktime-art; R=$D/run; OUTD=$D/builds
mkdir -p $R $OUTD $BK; chmod 700 $R $OUTD
umask 077; PRIV=$R/deploy-$ID.private; : > $PRIV
p() { printf '%s\n' "$*" >> $PRIV; }
fail() { echo "FAILED: $*"; p "FAILED: $*"; exit 1; }
q() { sqlite3 -readonly -cmd ".timeout 15000" "$@"; }   # read-only, waits for the clinic's writes instead of failing
TOK=$(cat $R/cf-$ID.tok 2>/dev/null || true); rm -f $R/cf-$ID.tok
[ "$CF" = 1 ] && [ -z "$TOK" ] && { echo "note: no Cloudflare API token (secret CF_API_TOKEN) — the Cloudflare copy is skipped and keeps its current version"; CF=0; }
trap '' TERM HUP INT     # a production deploy is never stopped halfway
echo "== production deploy $ID ($(date '+%F %T'))"
exec 9>$R/deploy.lock
flock -n 9 || { echo "another production deploy is running: waiting for it (max 30 min)"; flock -w 1800 9 || fail "the other deploy did not finish in 30 min"; }
[ -f $R/BLOCKED ] && fail "production deploys are blocked since an earlier deploy found missing or changed data — the owner must check first (see $R/BLOCKED on the server, then remove it)"
TS=$(date +%Y%m%d-%H%M%S)

# ---- 1. sources (nothing on the server changes in this step); wait until the three production branches stop changing
tips() { local r b; for r in impyar-backend impyar-frontend impyar-tablet; do b=BR_${r#impyar-}; b=${!b:-$BRANCH}
  [ -d $D/src/$r/.git ] || git clone -q $GH/$r.git $D/src/$r
  git -C $D/src/$r fetch -q --prune origin || return 1; printf '%s ' "$(git -C $D/src/$r rev-parse -q --verify origin/$b || echo none)"; done; }
T1=$(tips) || fail "cannot fetch the repos"
for i in 1 2 3 4 5; do [ "$STABLE" -gt 0 ] || break
  echo "waiting ${STABLE}s for other merges (the three repos are deployed together)"; sleep $STABLE
  T2=$(tips) || fail "cannot fetch the repos"; [ "$T1" = "$T2" ] && break; T1=$T2; done
for r in impyar-backend impyar-frontend impyar-tablet; do
  d=$D/src/$r; b=BR_${r#impyar-}; b=${!b:-$BRANCH}
  git -C $d rev-parse -q --verify origin/$b >/dev/null || fail "$r has no branch '$b'"
  git -C $d checkout -q -f --detach origin/$b; git -C $d clean -qfdx -e secrets/
  echo "$r $b $(git -C $d rev-parse --short HEAD) $(git -C $d log -1 --format=%s | cut -c1-70)"
done
FE=$D/src/impyar-frontend; B=$D/src/impyar-backend; TB=$D/src/impyar-tablet
[ -f $FE/tools/build.mjs ] && [ -f $FE/tools/assets.mjs ] || fail "impyar-frontend 'production' is older than the src/ layout: merge its staging into production first"
[ -s $TB/dist/implant-plan.apk ] || fail "impyar-tablet has no dist/implant-plan.apk"
$N $FE/tools/build.mjs --check >>$PRIV 2>&1 || { echo "impyar-frontend: committed pages differ from src/ — rebuilding them from src/"; $N $FE/tools/build.mjs >>$PRIV 2>&1 || fail "frontend rebuild failed (details on the server)"; }
HEADS=$(for r in impyar-backend impyar-frontend impyar-tablet; do printf '%s ' "$(git -C $D/src/$r rev-parse HEAD)"; done | sed 's/ $//')
LIVE=$(md5sum $APP/worker.js 2>/dev/null | cut -d' ' -f1 || true)
DO_IRAN=1; DO_CF=$CF
[ "${FORCE:-0}" != 1 ] && [ "$HEADS" = "$(cat $R/deployed.txt 2>/dev/null)" ] && [ -n "$LIVE" ] && [ "$LIVE" = "$(cat $R/deployed.md5 2>/dev/null)" ] && DO_IRAN=0
[ "${FORCE:-0}" != 1 ] && [ "$CF" = 1 ] && [ "$HEADS" = "$(cat $R/cf-deployed.txt 2>/dev/null)" ] && DO_CF=0
if [ $DO_IRAN = 0 ] && [ $DO_CF = 0 ]; then echo "production already runs exactly these commits: nothing to do"; echo PROD-DEPLOY-DONE; exit 0; fi

# ---- 2. database
FIRST=0; [ -f $APP/worker.js ] || FIRST=1          # first install = no worker was ever installed on this server
rescue() { # the running server may still hold a removed or replaced database open: copy it out before anything stops it
  local pid fd t got=1; pid=$(systemctl show -p MainPID --value $SVC 2>/dev/null || echo 0); [ "${pid:-0}" -gt 0 ] || return 1
  for fd in /proc/$pid/fd/*; do t=$(readlink "$fd" 2>/dev/null || true)
    case "$t" in "$DB (deleted)") cp "$fd" $BK/rescue-$TS.db && got=0;; "$DB-wal (deleted)"|"$DB-wal") cp "$fd" $BK/rescue-$TS.db-wal || true;; esac; done
  [ $got = 0 ] && { p "rescue copy: $BK/rescue-$TS.db"; echo "the running server still held the removed database open: a rescue copy was saved in the backups folder"; }
  return $got; }
BLK=/etc/systemd/system/$SVC.service.d/zz-deploy-blocked.conf
block() { rescue || true   # then: refuse every start (also Restart=always and reboots) until the owner removes the drop-in
  mkdir -p ${BLK%/*}; printf '[Service]\nExecStartPre=/bin/sh -c "echo blocked by the production deploy: the database is missing or empty - restore it, then remove %s; exit 1"\n' "$BLK" > $BLK
  systemctl daemon-reload || true; systemctl stop $SVC || true
  fail "$1 — service '$SVC' stopped and blocked from starting. Restore the database (rescue-$TS.db if it was saved, else the latest backup in $BK), then: rm $BLK && systemctl daemon-reload && systemctl start $SVC, and run the deploy again"; }
NEWDB=0
if [ ! -f $DB ]; then
  [ $FIRST = 1 ] && { echo "first install and no database: the server creates an empty one on start"; NEWDB=1; } || block "the production database file is missing"
else
  E=$(q $DB "select count(*) from plans" 2>&1) && PC=$E || PC=x
  if [ "$PC" = x ]; then
    case "$E" in *"no such table"*) [ $FIRST = 1 ] || block "the production database has no plans table (a new, empty database)";;
      *) p "plans count error: $E"; fail "could not read the database (busy or damaged) — nothing changed; try again";; esac
  elif [ "$PC" = 0 ] && [ $FIRST = 0 ] && [ "$(cat $R/last-plans 2>/dev/null || echo unknown)" != 0 ]; then
    block "the production database has no plans but production had data"
  fi
fi

# ---- 3. build (secrets only on this server)
mkdir -p $B/secrets; for f in local.mjs code.txt; do [ -f $D/secrets/$f ] && cp $D/secrets/$f $B/secrets/$f; done
[ -f $B/secrets/local.mjs ] || fail "no secrets/local.mjs on the server (nobody could log in)"
TAG=prod-$(printf '%s %s' "$HEADS" "$TS" | sha1sum | cut -c1-10)          # unique per build: the marker checks see only this build
OUT=$OUTD/iran-$TS-$TAG.mjs; COUT=$OUTD/cf-$TS-$TAG.mjs
$N $B/scripts/build-bundle.mjs $FE $TB $OUT --target iran --tag $TAG >>$PRIV 2>&1 || fail "build (Yazd) failed (details on the server)"
$N --check $OUT >>$PRIV 2>&1 || fail "node --check (Yazd bundle) failed (details on the server)"
grep -q "^const IMPORT_KEY='';" $OUT || fail "the Yazd bundle has an import key: refused"
[ "$(stat -c %s $OUT)" -gt 2000000 ] || fail "the Yazd bundle is too small"
if [ $DO_CF = 1 ]; then
  $N $B/scripts/build-bundle.mjs $FE $TB $COUT --target cloudflare --tag $TAG >>$PRIV 2>&1 || fail "build (Cloudflare) failed (details on the server)"
  $N --check $COUT >>$PRIV 2>&1 || fail "node --check (Cloudflare bundle) failed (details on the server)"
  grep -qE "^const IMPORT_KEY='[^']+';" $COUT || fail "the Cloudflare bundle has no import key (the nightly copy needs it)"
fi
NEW=$(md5sum $OUT | cut -d' ' -f1); echo "built $TAG md5 $NEW (running: ${LIVE:-none})"

health() { local i h m; for i in $(seq 1 40); do
    h=$(curl -s -m 10 http://127.0.0.1:$PORT/health || true)
    if [ "$(systemctl is-active $SVC)" = active ] && [ -n "$h" ]; then m=$(curl -s -m 20 http://127.0.0.1:$PORT/ | grep -c -- "---------- $1 (" || true); [ "${m:-0}" -gt 0 ] && return 0; fi
    sleep 1; done; return 1; }
restart() { systemctl reset-failed $SVC >/dev/null 2>&1 || true; systemctl restart $SVC || true; }
if [ $DO_IRAN = 1 ]; then
  # ---- 4. backups: database (online, self-contained, checked) and running worker
  BDB=$BK/deploy-$TAG-$TS.db; WB=$BK/worker-before-$TAG-$TS.js
  if [ $NEWDB = 0 ]; then
    NEED=$(( $(stat -c %s $DB) + $(stat -c %s $DB-wal 2>/dev/null || echo 0) )); AV=$(df --output=avail -B1 $BK | tail -1 | tr -d ' ')
    [ "$AV" -gt $(( NEED * 2 + 1000000000 )) ] || fail "not enough free disk space for the database backup (nothing changed)"
    sqlite3 -cmd ".timeout 15000" $DB ".backup '$BDB'" 2>>$PRIV || { rm -f $BDB; fail "database backup failed (nothing changed)"; }
    sqlite3 $BDB "pragma journal_mode=delete" >/dev/null 2>>$PRIV || { rm -f $BDB; fail "database backup: journal mode (nothing changed)"; }
    [ "$(q $BDB 'pragma quick_check' 2>&1)" = ok ] || { rm -f $BDB; fail "the database backup does not pass quick_check (nothing changed)"; }
    p "db backup $BDB $(du -h $BDB | cut -f1)"; echo "database backed up and checked (quick_check ok)"
  fi
  [ -f $APP/worker.js ] && cp $APP/worker.js $WB
  # ---- 5. install → restart → health (rollback if not healthy)
  SB=""
  rollback() {
    echo "ROLLING BACK: $1"
    if [ -f $WB ]; then install -o $RUN_USER -g $RUN_USER -m 644 $WB $APP/worker.js || true
      [ -n "$SB" ] && install -o $RUN_USER -g $RUN_USER -m 644 $SB $APP/server.mjs || true
      restart; sleep 3
      if [ "$(md5sum $APP/worker.js | cut -d' ' -f1)" = "$LIVE" ] && [ "$(systemctl is-active $SVC)" = active ] && curl -s -m 10 -o /dev/null http://127.0.0.1:$PORT/health; then echo "rolled back: the previous version runs again"; else echo "ROLLBACK NOT CONFIRMED — check the server now"; fi
    else echo "no previous worker to roll back to"; fi
    fail "$1"; }
  if [ -f $B/ops/iran-server/server.mjs ] && ! cmp -s $B/ops/iran-server/server.mjs $APP/server.mjs; then
    [ -f $APP/server.mjs ] && { SB=$BK/server-before-$TAG-$TS.mjs; cp $APP/server.mjs $SB; }
    install -o $RUN_USER -g $RUN_USER -m 644 $B/ops/iran-server/server.mjs $APP/server.mjs || rollback "could not install server.mjs"; echo "server.mjs updated"; fi
  install -o $RUN_USER -g $RUN_USER -m 644 $OUT $APP/worker.js || rollback "could not install the worker"
  [ "${TEST_BREAK:-0}" = 1 ] && echo "this is not javascript" >> $APP/worker.js   # tests only (deploy.conf), never set on production
  T0=$(date '+%F %T'); restart
  health $TAG || rollback "not healthy after restart (service $(systemctl is-active $SVC))"
  [ "$(md5sum $APP/worker.js | cut -d' ' -f1)" = "$NEW" ] || rollback "installed file md5 differs from the build"
  echo "healthy: service active, /health answers, page marker $TAG, md5 ok"
  [ -n "${TEST_SQL:-}" ] && sqlite3 -cmd ".timeout 15000" $DB "$TEST_SQL"   # tests only (deploy.conf): change data right after the restart
  # ---- 6. data: every row of the backup (by primary key) must still be in the live database
  if [ $NEWDB = 0 ]; then
    lost() { # rows of table $1 in the backup whose key is not in the live database ("err" if the check cannot run)
      local pk n i; pk=$(q $BDB "select group_concat('\"'||name||'\"', ',') from (select name from pragma_table_info('$1') where pk>0 order by pk)" 2>/dev/null || true)
      [ -n "$pk" ] || { echo nokey; return; }
      for i in 1 2 3; do n=$(q $DB "attach '$BDB' as b; select count(*) from (select $pk from b.\"$1\" except select $pk from main.\"$1\")" 2>/dev/null) && { echo $n; return; }; sleep 2; done; echo err; }
    BAD=""; WARN=""
    for t in $(q $BDB "select name from sqlite_master where type='table' and name not like 'sqlite_%'"); do
      n=$(lost $t); case "$n" in 0) ;; nokey) p "no primary key, not compared: $t";; *) p "rows missing vs backup: $t $n"; WARN=1;; esac
      case "$t:$n" in pays:0|plans:0) ;; pays:*) BAD="payments lost";; plans:err) BAD="${BAD:+$BAD, }plans (check could not run)";; esac
    done
    # plans: a reception-queue delete of a plan without payments is normal; a lost plan WITH payments is not
    LP=$(q $DB "attach '$BDB' as b; select count(*) from b.plans x where not exists (select 1 from main.plans y where y.id=x.id) and exists (select 1 from b.pays z where z.plan=x.id)" 2>/dev/null || echo err)
    [ "$LP" = 0 ] || BAD="${BAD:+$BAD, }plans with payments lost"
    # money: an amount that changed although the row's edit stamp did not → the new code changed it
    EA=$(q $DB "attach '$BDB' as b; select count(*) from b.pays x join main.pays y on y.id=x.id where coalesce(y.amount,0)<>coalesce(x.amount,0) and coalesce(y.upd,'')=coalesce(x.upd,'')" 2>/dev/null || echo err)
    ED=$(q $DB "attach '$BDB' as b; select count(*) from b.pays x join main.pays y on y.id=x.id where coalesce(y.amount,0)<>coalesce(x.amount,0)" 2>/dev/null || echo err)
    [ "$EA" = 0 ] || BAD="${BAD:+$BAD, }payment amounts changed without an edit"
    p "plans backup/live: $(q $BDB 'select count(*) from plans' 2>&1) / $(q $DB 'select count(*) from plans' 2>&1)"
    p "pays count+sum backup: $(q $BDB "select count(*)||' '||coalesce(sum(amount),0) from pays" 2>&1) | live: $(q $DB "select count(*)||' '||coalesce(sum(amount),0) from pays" 2>&1) | amounts edited by users: $ED | changed without edit: $EA | lost plans with payments: $LP"
    if [ -n "$BAD" ]; then
      KB=$BK/keep-lost-$TAG-$TS.db; mv $BDB $KB
      printf '%s\n' "$(date '+%F %T') deploy $ID ($TAG): $BAD — backup kept: $KB (details: $PRIV)" > $R/BLOCKED
      rollback "data check: $BAD compared with the backup taken just before — the backup is kept and further deploys are BLOCKED until the owner checks (do not just run it again)"
    fi
    [ -n "$WARN" ] && echo "note: some rows were removed during the deploy (normal user deletes; details on the server)"
    [ "$ED" = 0 ] || echo "note: users edited payment amounts during the deploy (details on the server)"
    echo "data check: no payment lost, no plan with payments lost, no amount changed by the new code"
  fi
  E=$(journalctl -u $SVC --since "$T0" --no-pager 2>/dev/null | grep -ciE 'error|exception' || true); echo "errors in the service log since restart: ${E:-0}"
  for g in "$BK/deploy-*.db" "$BK/worker-before-*.js" "$BK/server-before-*.mjs" "$OUTD/iran-*.mjs"; do ls -1t $g 2>/dev/null | tail -n +$((KEEP+1)) | xargs -r rm -f || true; done   # keep the last 10 (only files made here)
  # what the GitHub "rollback" action needs to put back exactly the state from just before this deploy (rollback-prod.sh)
  { printf 'TAG=%q\nTS=%q\nBDB=%q\nWB=%q\nSB=%q\nPREV_MD5=%q\nNEW_MD5=%q\nPREV_HEADS=%q\n' "$TAG" "$TS" "$([ $NEWDB = 0 ] && echo $BDB)" \
      "$([ -f $WB ] && echo $WB)" "$SB" "$LIVE" "$NEW" "$(cat $R/deployed.txt 2>/dev/null || true)"; } > $R/last-deploy.env
  rm -f $R/last-cf.env
  printf '%s\n' "$HEADS" > $R/deployed.txt; printf '%s\n' "$NEW" > $R/deployed.md5
  q $DB "select count(*) from plans" > $R/last-plans 2>/dev/null || true
  echo "YAZD OK: $TAG md5 $NEW"
else echo "Yazd already runs these commits"; fi

# ---- 7. Cloudflare copy (only after Yazd is healthy)
if [ $DO_CF = 1 ]; then
  CFP=$B/ops/production/cf-put.mjs; [ -s $CFP ] || fail "Cloudflare: no ops/production/cf-put.mjs in impyar-backend"
  [ -n "$TOK" ] || fail "Cloudflare: no API token (secret CF_API_TOKEN) — Yazd is deployed, the Cloudflare copy is not"
  [ -s $D/secrets/cf-account ] || fail "Cloudflare: no secrets/cf-account on the server — Yazd is deployed, the Cloudflare copy is not"
  cfp() { CF_TOKEN=$TOK CF_ACCOUNT=$(tr -d ' \r\n' < $D/secrets/cf-account) $N $CFP "$@" >>$PRIV 2>&1; }
  cfok() { local i h m; for i in $(seq 1 12); do h=$(curl -s -m 15 -o /dev/null -w '%{http_code}' $CF_URL/health || true); m=$(curl -s -m 30 $CF_URL/ | grep -c -- "$1" || true); [ "$h" = 200 ] && [ "${m:-0}" -gt 0 ] && return 0; sleep 5; done; return 1; }
  CB=$OUTD/cf-before-$TS.mjs
  cfp get $CB && [ "$(stat -c %s $CB 2>/dev/null || echo 0)" -gt 100000 ] && $N --check $CB >>$PRIV 2>&1 || fail "Cloudflare: could not save the running Cloudflare worker (Cloudflare unchanged; Yazd is deployed)"
  cfp put $COUT || fail "Cloudflare upload failed (Cloudflare unchanged; Yazd is deployed)"
  if ! cfok "---------- $TAG ("; then
    PM=$(grep -o -- '<!-- ---------- [^ ]* (' $CB | tail -1 || true)
    if cfp put $CB && cfok "${PM:-</html>}"; then fail "Cloudflare not healthy after the upload: rolled back to the previous Cloudflare worker (checked). Yazd is deployed"
    else fail "Cloudflare not healthy after the upload AND the rollback could not be confirmed — Cloudflare needs a look (saved copy on the server). Yazd is deployed"; fi
  fi
  ls -1t $OUTD/cf-*.mjs 2>/dev/null | tail -n +$((2*KEEP+1)) | xargs -r rm -f || true
  printf '%s\n' "$HEADS" > $R/cf-deployed.txt
  printf 'CF_TAG=%q\nCB=%q\n' "$TAG" "$CB" > $R/last-cf.env    # the Cloudflare worker from before this deploy (for the rollback action)
  echo "CLOUDFLARE OK: $TAG"
fi
unset TOK
echo PROD-DEPLOY-DONE
