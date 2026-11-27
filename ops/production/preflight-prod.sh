#!/bin/bash
# Production preflight (run as root on the Yazd server; GitHub: "Deploy production" → Run workflow → preflight).
# Checks everything a deploy needs and CHANGES NOTHING on the running system: tools, secrets, disk, service, database
# (readable, quick_check, has data), no block left, the three 'production' branches, a full test build of both bundles
# (node --check, import keys, size), the Cloudflare token (download of the running Cloudflare worker), the rollback data.
# Public log: one line per check, OK or FAIL; numbers in run/deploy-<id>.private. Exit 1 if any check fails.
set -uo pipefail
ID=${1:?run id}
D=/opt/implant/deploy
[ -f $D/deploy.conf ] && . $D/deploy.conf          # only for tests on another server
APP=${APP:-/opt/implant/app}; DB=${DB:-/opt/implant/data/implant.db}; BK=${BK:-/opt/implant/backups}
SVC=${SVC:-implant}; PORT=${PORT:-8787}; N=${NODE:-/usr/bin/node}; BRANCH=${BRANCH:-production}; CF=${CF:-1}
GH=https://github.com/alirezaworktime-art; R=$D/run; umask 077; PRIV=$R/deploy-$ID.private; : > $PRIV
p() { printf '%s\n' "$*" >> $PRIV; }
q() { sqlite3 -readonly -cmd ".timeout 15000" "$@"; }
TOK=$(cat $R/cf-$ID.tok 2>/dev/null || true); rm -f $R/cf-$ID.tok
BAD=0; ck() { local name=$1; shift; if "$@" >>$PRIV 2>&1; then echo "OK    $name"; else echo "FAIL  $name"; BAD=1; fi; }
echo "== production preflight $ID ($(date '+%F %T')) — nothing is changed"
exec 9>$R/deploy.lock; flock -n 9 || { echo "a production deploy is running: waiting for it"; flock -w 1800 9 || { echo "FAIL  lock"; exit 1; }; }
ck "tools: node 24+, sqlite3, git, flock, curl" bash -c "$N -e 'process.exit(+process.versions.node.split(\".\")[0]>=24?0:1)' && command -v sqlite3 git flock curl"
ck "secrets on the server (local.mjs, code.txt, cf-account)" bash -c "[ -s $D/secrets/local.mjs ] && [ -s $D/secrets/code.txt ] && [ -s $D/secrets/cf-account ]"
ck "service '$SVC' active, /health answers" bash -c "[ \"\$(systemctl is-active $SVC)\" = active ] && curl -sf -m 10 -o /dev/null http://127.0.0.1:$PORT/health"
ck "service not blocked by an earlier deploy" bash -c "[ ! -f /etc/systemd/system/$SVC.service.d/zz-deploy-blocked.conf ] && [ ! -f $R/BLOCKED ]"
ck "database present and has data" bash -c "[ -f $DB ] && n=\$(sqlite3 -readonly -cmd '.timeout 15000' $DB 'select count(*) from plans') && echo plans \$n && [ \"\$n\" -gt 0 ]"
ck "database quick_check" bash -c "[ \"\$(sqlite3 -readonly -cmd '.timeout 15000' $DB 'pragma quick_check')\" = ok ]"
ck "free disk space for the deploy backup" bash -c "need=\$(( \$(stat -c %s $DB) + \$(stat -c %s $DB-wal 2>/dev/null || echo 0) )); av=\$(df --output=avail -B1 $BK | tail -1 | tr -d ' '); echo need \$need avail \$av; [ \$av -gt \$(( need*2 + 1000000000 )) ]"
T=$(mktemp -d); trap 'rm -rf $T' EXIT
for r in impyar-backend impyar-frontend impyar-tablet; do b=BR_${r#impyar-}; b=${!b:-$BRANCH}
  ck "$r: branch '$b' fetched" bash -c "git clone -q --depth 1 -b $b $GH/$r.git $T/$r && git -C $T/$r log -1 --format='%h %s'"; done
ck "frontend pages match src/" $N $T/impyar-frontend/tools/build.mjs --check
ck "tablet app present" test -s $T/impyar-tablet/dist/implant-plan.apk
mkdir -p $T/impyar-backend/secrets; cp $D/secrets/local.mjs $D/secrets/code.txt $T/impyar-backend/secrets/ 2>/dev/null
ck "test build (Yazd bundle): builds, node --check, no import key, size" bash -c "$N $T/impyar-backend/scripts/build-bundle.mjs $T/impyar-frontend $T/impyar-tablet $T/i.mjs --target iran --tag preflight && $N --check $T/i.mjs && grep -q \"^const IMPORT_KEY='';\" $T/i.mjs && [ \$(stat -c %s $T/i.mjs) -gt 2000000 ] && md5sum $T/i.mjs"
if [ "$CF" = 1 ]; then
  ck "test build (Cloudflare bundle): builds, node --check, has its import key" bash -c "$N $T/impyar-backend/scripts/build-bundle.mjs $T/impyar-frontend $T/impyar-tablet $T/c.mjs --target cloudflare --tag preflight && $N --check $T/c.mjs && grep -qE \"^const IMPORT_KEY='[^']+';\" $T/c.mjs"
  if [ -n "$TOK" ]; then
    ck "Cloudflare token works (download of the running Cloudflare worker)" env CF_TOKEN="$TOK" CF_ACCOUNT="$(tr -d ' \r\n' < $D/secrets/cf-account 2>/dev/null)" $N $T/impyar-backend/ops/production/cf-put.mjs get $T/cf-now.mjs
  else echo "info  no Cloudflare token (secret CF_API_TOKEN): a deploy updates Yazd only, Cloudflare keeps its current copy"; fi
fi
ck "running worker readable (rollback starting point)" test -s $APP/worker.js
p "running worker md5 $(md5sum $APP/worker.js | cut -d' ' -f1)"
[ -f $R/last-deploy.env ] && echo "info  last GitHub deploy recorded (rollback possible)" || echo "info  no GitHub deploy yet (the first deploy records the rollback data)"
unset TOK
[ $BAD = 0 ] && { echo "PREFLIGHT OK — ready to deploy"; exit 0; } || { echo "PREFLIGHT FAILED — do not deploy (details on the server)"; exit 1; }
