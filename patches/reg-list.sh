#!/bin/bash
# bash reg-list.sh <bundle> <tag> <listfile>  — runs the listed entries in 3 streams
B=$1; T=$2; W=${W:-$(cd "$(dirname "$0")" && pwd)}; O=$W/regl-$T; mkdir -p $O; rm -f $O/*.out; mapfile -t L < $3
one() { local out; out=$( cd $W/$2 && WORKER=$B OLD=$W/clean/m41-clean.mjs timeout 580 node --no-warnings --import $W/m23/sameday-shim.mjs $( [ "$1" = run ] && echo "--import $W/m39/lab-old-shim.mjs" ) $3 2>&1 | grep -E "^FAIL|ALL OK|FAILED|ERR|Error" | cut -c1-260 | tr '\n' ' ' ); echo "== $3: ${out:-NO OUTPUT}" ; }
for s in 0 1 2; do ( i=0; for e in "${L[@]}"; do if [ $((i % 3)) -eq $s ]; then one $e >> $O/s$s.out; fi; i=$((i+1)); done; echo DONE >> $O/s$s.out ) & done; wait; cat $O/s*.out > $W/regl-$T.out; echo ALLDONE >> $W/regl-$T.out
