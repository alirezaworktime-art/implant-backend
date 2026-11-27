#!/bin/bash
# One-time setup of the GitHub production deploy on the Yazd server (run as root; idempotent). Touches nothing that runs.
#   bash setup-prod.sh <deploy-key.pub>
# Creates /opt/implant/deploy/{src,secrets,run,builds} (root only) and lets <deploy-key.pub> log in as root for the deploy
# (like the staging deploy key; 'restrict' = no terminal, no forwarding). Other keys in authorized_keys are kept as they are.
# Copy these to /opt/implant/deploy/secrets/ before the first deploy (from the owner's laptop, never through GitHub):
#   local.mjs, code.txt (impyar-backend/secrets) and cf-account (the Cloudflare account id, one line).
# Bootstrap (once): create 'production' in all three repos from 'staging' (creating a branch deploys nothing), add the
# rulesets and the Environment 'production' (secrets + variables), then run "Deploy production" once from the Actions tab
# on impyar-backend 'production'. From then on every merge of staging into production deploys.
set -euo pipefail
PUB=${1:?usage: setup-prod.sh <deploy-key.pub>}; D=/opt/implant/deploy
grep -qE '^ssh-ed25519 [A-Za-z0-9+/=]+' $PUB || { echo "not an ed25519 public key: $PUB"; exit 1; }
install -d -m 700 $D $D/src $D/secrets $D/run $D/builds
rm -f $D/gate.sh
K=$(awk '{print $1" "$2}' $PUB); AK=/root/.ssh/authorized_keys; install -d -m 700 /root/.ssh; touch $AK; chmod 600 $AK
cp -p $AK $AK.before-prod-deploy
grep -vF "$K" $AK > $AK.new || true; printf '%s\n' "restrict $K github-production-deploy" >> $AK.new
[ "$(grep -cvF "$K" $AK.new)" = "$(grep -cvF "$K" $AK)" ] || { echo "authorized_keys check failed: unchanged"; rm -f $AK.new; exit 1; }
cat $AK.new > $AK; rm -f $AK.new
echo "deploy key allowed ($(grep -c 'github-production-deploy' $AK) entry; other keys: $(grep -vc 'github-production-deploy' $AK))"
ls -la $D/secrets | tail -n +4 | awk '{print "secret:", $9, $5" bytes"}'
