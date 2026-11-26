// cross-platform test runner (PowerShell, cmd and bash): sets WORKER and runs one test file with the same-day shim.
// usage: node scripts/run-test.mjs [test-file]   (default: patches/m61a/t-m61a.mjs)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const test = process.argv[2] || 'patches/m61a/t-m61a.mjs';
const env = { ...process.env, WORKER: process.env.WORKER || 'dist/worker.mjs' };
// tests default to /usr/bin/google-chrome; on Windows point CHROME at an installed Chrome/Edge unless already set
if (!env.CHROME && process.platform === 'win32') {
  const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const c = pf.flatMap(d => [d + '\\Google\\Chrome\\Application\\chrome.exe', d + '\\Microsoft\\Edge\\Application\\msedge.exe']).find(p => existsSync(p));
  if (c) env.CHROME = c;
}
const r = spawnSync(process.execPath, ['--no-warnings', '--import', './patches/m23/sameday-shim.mjs', test], { stdio: 'inherit', env });
process.exit(r.status ?? 1);
