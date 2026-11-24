#!/bin/bash
W=${W:-$(cd "$(dirname "$0")/.." && pwd)}
# full regression on one bundle (m40 and later): bash reg-m40.sh <bundle> <tag>
# lab tests written before m36 run with m39/lab-old-shim.mjs (test work type + referral); t-m24ui is retired (it tested the workbench table that m36 replaced; t-m36ui and t-m39ui cover its place).
# older scenarios run with m23/sameday-shim.mjs (they take the impression on the surgery day); e2e10-m23.mjs answers the new question in the page.
B=$1; T=$2; O=${OUT:-/tmp}/reg-$T.out; : > $O
run() { echo "== $1" >> $O; ( cd $2 && WORKER=$B timeout 580 node --no-warnings --import $W/m23/sameday-shim.mjs --import $W/m39/lab-old-shim.mjs $3 2>&1 | grep -E "^FAIL|ALL OK|FAILED|ERR" | cut -c1-300 >> $O ); }
# tests written for m36 and later run without the lab shim (they test the referral rule itself)
runn() { echo "== $1" >> $O; ( cd $2 && WORKER=$B timeout 580 node --no-warnings --import $W/m23/sameday-shim.mjs $3 2>&1 | grep -E "^FAIL|ALL OK|FAILED|ERR" | cut -c1-300 >> $O ); }
run t-m17 $W/m17 t-m17.mjs
run t-m18 $W/m18 t-m18.mjs
run t-m18ui $W/m18 t-m18ui.mjs
run t-m19 $W/m19 t-m19.mjs
run t-m20 $W/m20 t-m20.mjs
run t-m21 $W/m21 t-m21.mjs
run t-m22 $W/m22 t-m22.mjs
run t-m22ui $W/m22 t-m22ui.mjs
run t-m23 $W/m23 t-m23.mjs
run t-m23ui $W/m23 t-m23ui.mjs
run t-m25 $W/m25 t-m25.mjs
run t-m25ui $W/m25 t-m25ui.mjs
run t-m26 $W/m26 t-m26.mjs
run t-m26ui $W/m26 t-m26ui.mjs
run t-m27 $W/m27 t-m27.mjs
run t-m27ui $W/m27 t-m27ui.mjs
run t-m28ui $W/m28 t-m28ui.mjs
run t-m29 $W/m29 t-m29.mjs
run t-m29ui $W/m29 t-m29ui.mjs
run t-m30 $W/m30 t-m30.mjs
run t-m30ui $W/m30 t-m30ui.mjs
run t-m31 $W/m31 t-m31.mjs
run t-m31ui $W/m31 t-m31ui.mjs
run e2e10-m36 $W/audit e2e10-m36.mjs
run t-m32ui $W/m32 t-m32ui.mjs
run t-m33 $W/m33 t-m33.mjs
run t-m33ui $W/m33 t-m33ui.mjs
run t-m34ui $W/m34 t-m34ui.mjs
run t-m35 $W/m35 t-m35.mjs
run t-m35ui $W/m35 t-m35ui.mjs
run t-m35rx $W/m35 t-m35rx.mjs
run t-m35fin $W/m35 t-m35fin.mjs
runn t-m36 $W/m37 t-m36.mjs
runn t-m36mig $W/m37 t-m36mig.mjs
runn t-m36ui $W/m37 t-m36ui.mjs
runn t-m37 $W/m37 t-m37.mjs
runn t-m38 $W/m38 t-m38.mjs
runn t-m38ui $W/m38 t-m38ui.mjs
runn t-m39ui $W/m39 t-m39ui.mjs
runn t-m40 $W/m40 t-m40.mjs
runn t-m40ui $W/m40 t-m40ui.mjs
echo DONE >> $O
