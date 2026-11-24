$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$bk = Get-ChildItem "$env:USERPROFILE\Desktop\*\14*-*-*\worker_core.js" | sort LastWriteTime -desc | select -first 1
$tmp = Join-Path $env:TEMP 'implant-up'; New-Item -ItemType Directory -Force $tmp | Out-Null
Copy-Item "$here\server.mjs" $tmp -Force
Copy-Item $bk.FullName "$tmp\worker.js" -Force
$line = Get-Content "$env:LOCALAPPDATA\ImplantPlanBackup\backup-implant.ps1" | ? { $_ -match '^\s*\$Key\s*=' } | select -first 1
$key = ($line -split "'")[1]
$sha = [Security.Cryptography.SHA256]::Create()
$bytes = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes("ipk-bk|$key"))
$h = -join ($bytes | % { $_.ToString("x2") })
[IO.File]::WriteAllText("$tmp\bh.env", "BACKUP_HASH=$h`n")
$ssh = @('-i', "$env:USERPROFILE\.ssh\SSH_KEY_NAME", '-o', 'BatchMode=yes')
ssh @ssh -p SSH_PORT root@alavi.itpelc.ir "mkdir -p /tmp/up"
scp @ssh -P SSH_PORT "$tmp\server.mjs" "$tmp\worker.js" "$tmp\bh.env" root@alavi.itpelc.ir:/tmp/up/
Remove-Item "$tmp\bh.env"
"uploaded from " + $bk.Directory.Name + " (" + $bk.Length + " bytes)"
