#!/bin/bash
# subset regression: bash reg-sub.sh <bundle> <tag> <dir:file> ...
B=$1; T=$2; shift 2; O=/home/claude/w/reg-$T.out; : > $O
for x in "$@"; do d=${x%%:*}; f=${x##*:}; echo "== ${f%.mjs}" >> $O; ( cd /home/claude/w/$d && WORKER=$B timeout 580 node --no-warnings --import /home/claude/w/m23/sameday-shim.mjs $f 2>&1 | grep -E "^FAIL|ALL OK|FAILED|ERR" | cut -c1-260 >> $O ); done
echo DONE >> $O
