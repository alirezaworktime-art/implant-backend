# Daily backup of the Iran server (alavi.itpelc.ir) to this laptop.
# Copies: live database (consistent snapshot), app code, server config incl. keys, SSL certs, nginx/systemd.
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:USERPROFILE 'Desktop\ImplantIranServer-Backup'
$day  = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dest = Join-Path $root $day
$log  = Join-Path $root 'backup-log.txt'
New-Item -ItemType Directory -Force $dest | Out-Null
$key = Join-Path $env:USERPROFILE '.ssh\SSH_KEY_NAME'
$ssh = @('-i', $key, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=25')
try {
  & ssh @ssh -p SSH_PORT root@alavi.itpelc.ir implant-snapshot
  if ($LASTEXITCODE -ne 0) { throw "remote snapshot failed ($LASTEXITCODE)" }
  & scp @ssh -P SSH_PORT 'root@alavi.itpelc.ir:/tmp/bk/*' $dest
  if ($LASTEXITCODE -ne 0) { throw "download failed ($LASTEXITCODE)" }
  & ssh @ssh -p SSH_PORT root@alavi.itpelc.ir 'rm -rf /tmp/bk'
  # keep a copy of the SSH key and the local scripts with every backup
  New-Item -ItemType Directory -Force (Join-Path $root 'keys') | Out-Null
  Copy-Item $key, "$key.pub" (Join-Path $root 'keys') -Force
  $size = [math]::Round(((Get-ChildItem $dest | Measure-Object Length -Sum).Sum / 1MB), 2)
  if (Test-Path (Join-Path $root 'LATEST')) { Remove-Item (Join-Path $root 'LATEST') -Recurse -Force }
  Copy-Item $dest (Join-Path $root 'LATEST') -Recurse -Force
  # keep the newest 60 backups
  Get-ChildItem $root -Directory | ? { $_.Name -match '^\d{4}-\d\d-\d\d_\d{4}$' } | sort Name -Descending | select -Skip 60 | Remove-Item -Recurse -Force
  Add-Content $log ("{0}  OK  {1}  {2} MB" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $day, $size)
} catch {
  Add-Content $log ("{0}  FAILED  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $_.Exception.Message)
  if ((Get-ChildItem $dest -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) { Remove-Item $dest -Force -ErrorAction SilentlyContinue }
  exit 1
}
