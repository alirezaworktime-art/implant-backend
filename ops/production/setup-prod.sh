#!/bin/bash
# One-time setup of the GitHub production deploy on the Yazd server (run as root; idempotent). Touches nothing that runs.
#   bash setup-prod.sh <deploy-key.pub> [deploy root=/opt/implant/deploy]
# Creates <root>/{src,secrets,run,builds} (root only), installs gate.sh there, and lets <deploy-key.pub> log in as root
# ONLY to run gate.sh (forced command: no shell, no forwarding, no terminal).
# Copy these to <root>/secrets/ before the first deploy (from the owner's laptop, never through GitHub):
#   local.mjs, code.txt (impyar-backend/secrets) and cf-account (the Cloudflare account id, one line).
set -euo pipefail
PUB=${1:?usage: setup-prod.sh <deploy-key.pub> [root]}; D=${2:-/opt/implant/deploy}; HERE=$(dirname "$(readlink -f "$0")")
grep -qE '^ssh-ed25519 [A-Za-z0-9+/=]+' $PUB || { echo "not an ed25519 public key: $PUB"; exit 1; }
install -d -m 700 $D $D/src $D/secrets $D/run $D/builds
install -m 755 $HERE/gate.sh $D/gate.sh
K=$(awk '{print $1" "$2}' $PUB); AK=/root/.ssh/authorized_keys; install -d -m 700 /root/.ssh; touch $AK; chmod 600 $AK
LINE="command=\"$D/gate.sh\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty,no-user-rc $K github-production-deploy"
grep -vF "$K" $AK > $AK.new || true; printf '%s\n' "$LINE" >> $AK.new; cat $AK.new > $AK; rm -f $AK.new
echo "gate installed: $D/gate.sh; deploy key allowed only for it ($(grep -c 'github-production-deploy' $AK) entry)"
ls -la $D/secrets | tail -n +4 | awk '{print "secret:", $9, $5" bytes"}'
