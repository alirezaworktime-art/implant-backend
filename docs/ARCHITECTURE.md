# Architecture

```
 browsers / tablet app (WebView)                     Google (Apps Script, Sheet)
            │  HTTPS                                         ▲  PDF copy, e-mail, nightly summary
            ▼                                                │
  nginx (Let's Encrypt) ── Node 24 ── worker bundle ── node:sqlite (implant.db)        ← primary, Iran server
                                         │   nightly 00:00 Tehran: full copy
                                         ▼
                           Cloudflare Worker ── D1                                    ← backup copy only
```

## One bundle, three sources
The deployed file is one ES module (`dist/worker.mjs`, ~8 MB) built by `scripts/build-bundle.mjs` from:
- `src/header.js` — constants, default tariffs/settings, secret placeholders,
- `ASSETS` — every file of **implant-frontend** (+ the APK of **implant-tablet**) as `{ t: content-type, d: data, b: base64? }`,
- `src/server.js` — the API.

`export default { fetch }` answers `GET` with an asset and `POST /` with the API. The same file runs on Cloudflare (D1 binding `DB`)
and on the Iran server, where `ops/iran-server/server.mjs` provides a D1-compatible object over `node:sqlite` and a Node HTTP server.

## API
- One endpoint, JSON body `{ action, password | (user, pw), …fields }`, answer `{ ok, … }` or `{ ok: false, error }` (Persian message).
- Role from the password (`kv pw:<role>`, `PW_HASH`) or a personal user (`users`). Allowed actions per role: `*_ACTIONS` maps → `docs/API-ACTIONS.md`.
- Request routing grew by wrapping: each feature keeps the previous function and replaces it (`const _x = f; f = async function () { … return _x.apply(this, arguments) }`).
  `arc6Route` is the router new actions hook into. Read a function from the **last** wrapper up.
- Idempotency: write actions take a `sendId`; the first reply is kept in `kv` and returned again for a repeated `sendId`.
- Audit: `audit` table (user, role, action, ip), `events` (per patient timeline, undo).

## Data
SQLite / D1, schema in `docs/DB-SCHEMA.md` (more tables are created on first use of a feature). A patient is one row in `plans`;
treatment plan, surgery sessions and prosthesis are JSON columns (`data`, `surg`, `pros`). Money: `pays`, `refunds`, `fin_*`.
Lab: `labs`, `lab_*`. Stock: `inv_*`. Appointments: `appts`; work queue / reminders: `tasks` (kind + due).

## Front end
`implant-frontend/index.html` is the whole app (vanilla JS). Globals and functions are extended the same way as on the server
(wrappers in later `<script>` blocks: one block per patch, marked `---------- mNN (`). PDFs are drawn on a canvas and written by the app.
Offline: drafts and the surgery-day queue in `localStorage`; service worker for the app shell.

## Operations (Iran server)
systemd `implant` (127.0.0.1:8787), timers: nightly copy to Cloudflare + Google Sheet summary, 00:30 database snapshot (30 days),
SSL renewal, 10-minute monitor with e-mail alerts. Deploy: build → `node --check` → upload to Cloudflare → copy to the server, restart, md5 check.
Scripts: `ops/iran-server/` (addresses, ports and keys replaced by placeholders).
