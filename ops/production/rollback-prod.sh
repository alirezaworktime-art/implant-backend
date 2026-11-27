#!/bin/bash
# Undo the last production deploy (run as root on the Yazd server; GitHub: "Deploy production" → Run workflow → rollback).
#   bash rollback-prod.sh <run-id> code      the worker (and server.mjs) from just before the deploy; Cloudflare too
#   bash rollback-prod.sh <run-id> all       the same + the DATABASE from just before the deploy
# 'all' first stops the service and takes a safety copy of the database as it is now (backups/before-rollback-*.db, never
# deleted automatically): whatever was entered after the deploy is removed from the live database but stays in that copy.
# Uses what deploy-prod.sh recorded in run/last-deploy.env; refuses if production no longer runs that deploy, or if it
# was already rolled back. If the old version does not come up healthy, it puts the deployed version (and database) back.
# Public log: steps and OK/FAILED only; numbers in run/deploy-<id>.private.
set -euo pipefail
ID=${1:?run id}; MODE=${2:-code}
case "$MODE" in code|all) ;; *) echo "usage: rollback-prod.sh <run-id> code|all"; exit 2;; esac
D=/opt/implant/deploy
[ -f $D/deploy.conf ] && . $D/deploy.conf          # only for tests on another server
APP=${APP:-/opt/implant/app}; DB=${DB:-/opt/implant/data/implant.db}; BK=${BK:-/opt/implant/backups}
SVC=${SVC:-implant}; PORT=${PORT:-8787}; RUN_USER=${RUN_USER:-implant}; N=${NODE:-/usr/bin/node}
CF=${CF:-1}; CF_URL=${CF_URL:-https://implant-api.implant-yazd.workers.dev}
R=$D/run; umask 077; PRIV=$R/deploy-$ID.private; : > $PRIV
p() { printf '%s\n' "$*" >> $PRIV; }
fail() { echo "FAILED: $*"; p "FAILED: $*"; exit 1; }
q() { sqlite3 -readonly -cmd ".timeout 15000" "$@"; }
TOK=$(cat $R/cf-$ID.tok 2>/dev/null || true); rm -f $R/cf-$ID.tok
[ "$CF" = 1 ] && [ -z "$TOK" ] && { echo "note: no Cloudflare API token (secret CF_API_TOKEN) — the Cloudflare copy is skipped and keeps its current version"; CF=0; }
trap '' TERM HUP INT
echo "== production ROLLBACK ($MODE) $ID ($(date '+%F %T'))"
exec 9>$R/deploy.lock
flock -n 9 || { echo "a production deploy is running: waiting for it (max 30 min)"; flock -w 1800 9 || fail "the other run did not finish in 30 min"; }
[ -f $R/last-deploy.env ] || fail "no recorded production deploy to roll back"
. $R/last-deploy.env
[ "${RB_DONE:-0}" = 1 ] && fail "the last deploy ($TAG) was already rolled back"
[ -n "${WB:-}" ] && [ -f "$WB" ] || fail "the worker from before $TAG is not on the server any more"
[ "$(md5sum $APP/worker.js | cut -d' ' -f1)" = "$NEW_MD5" ] || fail "production does not run the last deploy ($TAG) any more — nothing changed"
if [ $MODE = all ]; then
  [ -n "${BDB:-}" ] && [ -f "$BDB" ] || fail "the database backup from before $TAG is not on the server (first install?) — use 'code'"
  [ "$(q $BDB 'pragma quick_check' 2>&1)" = ok ] || fail "the database backup from before $TAG does not pass quick_check — nothing changed"
  NEED=$(( $(stat -c %s $DB) * 2 + 1000000000 )); AV=$(df --output=avail -B1 $BK | tail -1 | tr -d ' ')
  [ "$AV" -gt "$NEED" ] || fail "not enough free disk space for the safety copy — nothing changed"
fi
TS=$(date +%Y%m%d-%H%M%S); echo "rolling back deploy $TAG"
health() { local i h; for i in $(seq 1 40); do h=$(curl -s -m 10 http://127.0.0.1:$PORT/health || true)
  [ "$(systemctl is-active $SVC)" = active ] && [ -n "$h" ] && return 0; sleep 1; done; return 1; }
restart() { systemctl reset-failed $SVC >/dev/null 2>&1 || true; systemctl restart $SVC || true; }
CUR=$BK/rollback-from-$TAG-$TS.js; cp $APP/worker.js $CUR; [ -f $APP/server.mjs ] && cp $APP/server.mjs $CUR.server.mjs
SAFE=""
if [ $MODE = all ]; then
  systemctl stop $SVC || true                      # nothing writes now; the safety copy below is complete
  SAFE=$BK/before-rollback-$TAG-$TS.db
  sqlite3 -cmd ".timeout 15000" $DB ".backup '$SAFE'" 2>>$PRIV || { restart; fail "safety copy of the current database failed — service started again, nothing changed"; }
  sqlite3 $SAFE "pragma journal_mode=delete" >/dev/null 2>>$PRIV || true
  [ "$(q $SAFE 'pragma quick_check' 2>&1)" = ok ] || { restart; fail "safety copy does not pass quick_check — service started again, nothing changed"; }
  p "safety copy $SAFE; plans now/backup: $(q $SAFE 'select count(*) from plans') / $(q $BDB 'select count(*) from plans'); pays now/backup: $(q $SAFE "select count(*)||' '||coalesce(sum(amount),0) from pays") / $(q $BDB "select count(*)||' '||coalesce(sum(amount),0) from pays")"
  echo "service stopped; current database saved (safety copy, checked)"
  OWN=$(stat -c '%U:%G' $DB); MOD=$(stat -c '%a' $DB)
  cp $BDB $DB.rollback && chown $OWN $DB.rollback && chmod $MOD $DB.rollback || { rm -f $DB.rollback; restart; fail "could not prepare the database — service started again, nothing changed"; }
  rm -f $DB-wal $DB-shm; mv -f $DB.rollback $DB
  echo "database put back to the state from just before $TAG"
fi
install -o $RUN_USER -g $RUN_USER -m 644 $WB $APP/worker.js
[ -n "${SB:-}" ] && [ -f "$SB" ] && install -o $RUN_USER -g $RUN_USER -m 644 $SB $APP/server.mjs
restart
if ! health || [ "$(md5sum $APP/worker.js | cut -d' ' -f1)" != "$PREV_MD5" ]; then
  echo "the previous version did not come up healthy: putting the deployed version back"
  install -o $RUN_USER -g $RUN_USER -m 644 $CUR $APP/worker.js; [ -f $CUR.server.mjs ] && install -o $RUN_USER -g $RUN_USER -m 644 $CUR.server.mjs $APP/server.mjs
  if [ -n "$SAFE" ]; then systemctl stop $SVC || true; cp $SAFE $DB.back && chown $OWN $DB.back && chmod $MOD $DB.back && rm -f $DB-wal $DB-shm && mv -f $DB.back $DB; fi
  restart; health && fail "rollback did not work; the deployed version (and its database) runs again — nothing lost" || fail "rollback did not work AND the deployed version is not healthy — check the server now"
fi
echo "Yazd rolled back: the version from before $TAG runs (service active, /health answers, md5 ok)"
printf 'RB_DONE=1\n' >> $R/last-deploy.env
printf '%s\n' "rolled-back-$TAG" > $R/deployed.txt; printf '%s\n' "$PREV_MD5" > $R/deployed.md5   # a later push deploys again
q $DB "select count(*) from plans" > $R/last-plans 2>/dev/null || true
if [ "$CF" = 1 ] && [ -f $R/last-cf.env ]; then
  . $R/last-cf.env
  if [ "${CF_TAG:-}" = "$TAG" ] && [ -f "${CB:-}" ]; then
    [ -n "$TOK" ] || fail "Yazd rolled back; Cloudflare NOT rolled back (no API token)"
    CFP=$D/src/impyar-backend/ops/production/cf-put.mjs
    CF_TOKEN=$TOK CF_ACCOUNT=$(tr -d ' \r\n' < $D/secrets/cf-account) $N $CFP put $CB >>$PRIV 2>&1 || fail "Yazd rolled back; Cloudflare upload of the previous worker failed"
    PM=$(grep -o -- '<!-- ---------- [^ ]* (' $CB | tail -1 || true); ok=0
    for i in $(seq 1 12); do [ "$(curl -s -m 15 -o /dev/null -w '%{http_code}' $CF_URL/health || true)" = 200 ] && [ "$(curl -s -m 30 $CF_URL/ | grep -c -- "${PM:-</html>}" || true)" -gt 0 ] && { ok=1; break; }; sleep 5; done
    [ $ok = 1 ] || fail "Yazd rolled back; Cloudflare uploaded but its check failed — needs a look"
    rm -f $R/cf-deployed.txt; echo "Cloudflare rolled back (checked)"
  else echo "Cloudflare: the last deploy did not change it — nothing to roll back there"; fi
fi
unset TOK
echo PROD-ROLLBACK-DONE
