# Development

Requirements: **Node.js 24+** (`node:sqlite`), git, Chrome for the browser tests.

```
git clone https://github.com/alirezaworktime-art/implant-backend
git clone https://github.com/alirezaworktime-art/implant-frontend
git clone https://github.com/alirezaworktime-art/implant-tablet
cd implant-backend && npm install
npm run dev          # builds and serves http://127.0.0.1:8787/ on dev-data/dev.db; prints development passwords per role
npm run dev:fresh    # same on an empty database
```
The three repos must sit side by side (the scripts look for `../implant-frontend` and `../implant-tablet`).

## Change something
- Page: edit `implant-frontend/index.html` (or `p.html` / `f.html`), restart `npm run dev`, reload.
- API: edit `src/server.js`. A new action: write the function, add it to the role maps (`STAFF_ACTIONS.x = 1` …) and hook it into `arc6Route`
  (see the end of `src/server.js` for many examples).
- Tables: `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE … ADD COLUMN` inside the server (no migration tool); keep it idempotent.
- Text is Persian; numbers to the user in Persian digits (`fa`, `faD`); dates Jalali (`jalali`, `jt`, `jd`).

## Tests
```
npm test                     # build + patches/m61a/t-m61a.mjs
npm run test:all             # build + the full regression (≈90 tests, ~10 min, 3 parallel streams)
WORKER=$PWD/dist/worker.mjs node --no-warnings --import ./patches/m23/sameday-shim.mjs patches/m60a/t-m60a.mjs
```
Each test starts the bundle on a fresh temporary database with test passwords (`patches/h/h.mjs`, `patches/audit/A.mjs`),
and uses Playwright (`playwright-core`, Chrome at `$CHROME` or `/usr/bin/google-chrome`). `patches/audit/server-clock.mjs` lets a test move the clock.
Known failing: `m22/t-m22.mjs` (one check), tests that need `$OLD` (an older bundle: `m41b/t-m41b.mjs`, `m51b/t-restart*.mjs`).

## Release (owner's rules)
Ask the owner before every change and every release. Never commit passwords, keys or patient data. After a release: md5 of the
deployed file, version marker on both addresses, service status, error count; keep the previous bundle for rollback.
`secrets/local.mjs` (git-ignored) holds the real values; `node scripts/secrets-from-bundle.mjs <iran bundle> <cf bundle> ../implant-frontend`
recreates it from deployed bundles and checks that the repos rebuild them exactly. `--target cloudflare` builds the Cloudflare copy.

## History
`patches/mNN/SPEC.md` explains every change from m17 to m61a (Persian). The code in `src/` and in **implant-frontend** already contains
all of them; the patch files are kept for history and for their tests.
