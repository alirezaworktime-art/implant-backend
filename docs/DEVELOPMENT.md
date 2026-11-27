# Development

Requirements: **Node.js 24+** (`node:sqlite`), git, Chrome for the browser tests.

```
git clone https://github.com/alirezaworktime-art/impyar-backend
git clone https://github.com/alirezaworktime-art/impyar-frontend
git clone https://github.com/alirezaworktime-art/impyar-tablet
cd impyar-backend && npm install
npm run dev          # builds and serves http://127.0.0.1:8787/ on dev-data/dev.db; prints development passwords per role
npm run dev:fresh    # same on an empty database
```
The three repos must sit side by side (the scripts look for `../impyar-frontend` and `../impyar-tablet`).

## Change something
- Page: edit the file under `impyar-frontend/src/` (see its `docs/STRUCTURE.md`), run `node tools/build.mjs` there, restart `npm run dev`, reload. Never edit the generated root pages.
- API: edit `src/server.js`. A new action: write the function, add it to the role maps (`STAFF_ACTIONS.x = 1` …) and hook it into `arc6Route`
  (see the end of `src/server.js` for many examples).
- Tables: `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN` inside the server (no migration tool); keep it idempotent.
- Text is Persian; numbers to the user in Persian digits (`fa`, `faD`); dates Jalali (`jalali`, `jt`, `jd`).

## Tests
```
npm test                     # build + patches/m61a/t-m61a.mjs
npm run test:all             # build + the full regression (90 tests, ~10 min, 4 parallel streams) → patches/reg-all.out
node scripts/run-test.mjs patches/m60a/t-m60a.mjs   # one test (sets WORKER, the shim and, on Windows, CHROME)
```
All three work from PowerShell, cmd, Git Bash and Linux. `test:all` runs `scripts/reg-all.mjs`, which reads the test list from
`patches/reg-all.sh` (kept as it was) — `REG_STREAMS` / `REG_TIMEOUT` (seconds) change streams and per-test timeout; exit code is 0, read the summary line.
On GitHub: Actions → **Full regression** → Run workflow (Linux, manual only; result in the `reg-linux` artifact).

Each test starts the bundle on a fresh temporary database with test passwords (`patches/h/h.mjs`, `patches/audit/A.mjs`),
and uses Playwright (`playwright-core`, Chrome at `$CHROME`, `/usr/bin/google-chrome`, or on Windows the installed Chrome/Edge). `patches/audit/server-clock.mjs` lets a test move the clock.
Known failing (2026-11-26: Linux 87/90, Windows 86/90):
- `m22/t-m22.mjs` (one check), `audit/e2e10-m36.mjs`, and tests that need `$OLD` (an older bundle, not in the repo: `m41b/t-m41b.mjs`, `m51b/t-restart*.mjs`).
- Windows only: `m44b/t-m44bui.mjs` (phone width). The tests block Google Fonts, so the page falls back to Tahoma, which exists on
  Windows but not on Linux or phones; with Tahoma the archive table is 13 px wider than a 390 px screen. Passes on Linux.

## Release (owner's rules)
On the owner's laptop: `bash claude-code-kit/build-repo.sh <tag>` (Git Bash) builds `iran-worker-<tag>.mjs` and `cf-<tag>.mjs` from the three repos
(`--tag` puts the marker `---------- <tag> (` into the page) and writes `deploy-<tag>.sh`, `check-<tag>.sh`, `pub-<tag>.sh` the same way as the patch releases;
then `bash claude-code-kit/work/<tag>/pub-<tag>.sh`.

Ask the owner before every change and every release. Never commit passwords, keys or patient data. After a release: md5 of the
deployed file, version marker on both addresses, service status, error count; keep the previous bundle for rollback.
`secrets/local.mjs` (git-ignored) holds the real values; `node scripts/secrets-from-bundle.mjs <iran bundle> <cf bundle> ../impyar-frontend`
recreates it from deployed bundles and checks that the repos rebuild them exactly. `--target cloudflare` builds the Cloudflare copy.

## History
`patches/mNN/SPEC.md` explains every change from m17 to m61a (Persian). The code in `src/` and in **impyar-frontend** already contains
all of them; the patch files are kept for history and for their tests.
