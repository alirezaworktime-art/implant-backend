param([string]$Script)
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
$raw = Get-Content -Raw -Encoding UTF8 $Script
$raw | ssh -i $env:USERPROFILE\.ssh\SSH_KEY_NAME -p SSH_PORT -o BatchMode=yes -o ConnectTimeout=20 root@alavi.itpelc.ir "tr -d '\r' > /tmp/_run.sh; bash /tmp/_run.sh 2>&1"
