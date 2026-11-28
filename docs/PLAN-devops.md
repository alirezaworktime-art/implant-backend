# DevOps plan (draft)

Status: **draft**, 2026-11-26. Every step below needs the owner's go-ahead before it starts.
Rule while this plan runs: the live product and everything old keep working exactly as today; only DevOps changes,
no change to features or to the built server/page code.

## Goal
One source of truth: the three repos **impyar-backend**, **impyar-frontend**, **impyar-tablet**.
After a successful deploy built from these repos, all work happens here; the old patch method and the old repo
`implant-plan` become archive only.

## Where things stand
| | State |
|---|---|
| Live | patch release **m61a** (Iran server primary, Cloudflare copy overwritten every night) |
| Repos | snapshot of m61a; renamed to impyar-* (2026-11-26) |
| Drift (repo build vs live m61a) | **none in code**: header, server, every page byte-identical (one comment in `src/server.js` aside). Differences: tablet APK (repo 2.0, live 1.0) — the first deploy from the repos ships 2.0 (owner decision) |
| Embedded source copy (`CODE`, used by the daily backup) | put back by the build from `secrets/code.txt` (laptop only, git-ignored; `scripts/code-from-bundle.mjs`) |
| Line endings | `.gitattributes` forces LF; Windows and Linux builds are byte-identical |
| Tests | `npm test` (CI on every push); `npm run test:all` on Windows/Linux/PowerShell; GitHub **Full regression** (manual). Linux 87/90, Windows 86/90 (known failures in DEVELOPMENT.md) |
| Old path | GitHub Pages of `implant-plan` switched off 2026-11-26 (tablet app 1.x shows an error; install 2.0). Repo `implant-plan` itself untouched |

## Next steps (in order)
1. **Manual deploy from the repos** (laptop): build a tagged release from committed repos, check it against the previous
   release (only expected differences), publish with the existing deploy scripts, verify md5 on both targets, keep the
   previous release ready for rollback. Tag the release in all three repos (`rN`).
2. **Drift check** after every release (and before the first repo release): build from the repos and compare with the
   deployed bundle — part by part, printing only same/differs.
3. **Deploy with GitHub Actions** (later, manual trigger only, never on push). Open questions before any work:
   can GitHub runners reach the primary server at all; secrets (deploy key, Cloudflare token, build secrets) go into
   GitHub Secrets and are entered by the owner; the repos are public, so the workflow must never print a value and must
   run the leak check first; rollback path.
4. After a successful repo deploy: patch method and `implant-plan` → archive.

## Staging (running since 2026-11-26; since 2026-11-28 on the Yazd server)
- **https://alavi-stage.itpelc.ir** on the Yazd server, fully separated from production: own user `implantstg` (the GitHub
  deploy logs in as it, never root, and may only restart `implant-staging`), own folder `/opt/implant-staging`, service
  `implant-staging` (127.0.0.1:8788) with memory/CPU/IO limits, production paths inaccessible, own nginx block and certificate,
  **own database** (fake patients built by `scripts/staging-db.mjs`, no real data). Secrets and variables in the GitHub
  Environment `staging` (staging branch only). Setup: `ops/staging/setup-staging.sh`. The old staging (demo.impyar.ir on the
  clinics server) is switched off; its files are kept.
- Deploy: every push to `staging` in **any** of the three repos runs `.github/workflows/staging-deploy.yml` (frontend and
  tablet call it from impyar-backend `staging`). The server part runs detached (`ops/staging/run-deploy.sh` →
  `deploy-staging.sh`): fetch the three `staging` branches, build there, same checks as production, rollback if unhealthy.
- Newest push wins: in the same repo GitHub cancels the older run; across repos the newer deploy stops the older one on the
  server — at once while building (nothing changed), or after the short install → health/rollback window. A stopped run
  ends SUPERSEDED (green). A run whose commits are already live does nothing. Tested 2026-11-26 (frontend + tablet
  5 s apart → one real deploy with both).
- Merging into `staging` stays manual (owner in VS Code, or Claude when asked). Merge impyar-backend first when its
  deploy scripts changed (the workflow checks and fails loudly otherwise).
- Releasing a change: commit to `main` → merge into `staging` → check https://alavi-stage.itpelc.ir → then production.
- To do: a real `staging.impyar.ir` once the impyar.ir DNS (ArvanCloud) is reachable; then move staging there.
- Step 1: the same single bundle as production. Step 2: split services on staging (API service; page files and APK served
  by nginx; frontend deploy = file copy without restart), compare behaviour with production, then do the same for production.
  Needs: nginx giving the same headers as the bundle (ETag, Cache-Control, HSTS, X-Frame-Options, nosniff, no-referrer,
  CSP frame-ancestors) and the same routes (`/p`, `/f`, `/probe`); a frontend build step for the build-time values;
  the daily backup's `code.files` and the Cloudflare copy still need the single bundle.

## Safety issues to fix later (owner: "not now")
- Staging is identical to production, so it sends to the **production Google Apps Script** (PDFs to Drive, e-mail,
  settings, sheet) — build staging without the Apps Script id, or with a staging script.
- Staging accepts the **production passwords** — use test passwords on staging.
- GitHub holds the laptop's **root SSH key** of the clinics server (secret `STAGING_SSH_KEY`) — replace it with a deploy
  user that may only run the staging deploy.
- The production build secrets and the CODE copy are on the clinics server (`/opt/implant-staging/secrets`, root only).
- Scheduled GitHub runs stop after 60 days without a commit in a public repo.
- (Fixed: staging uses fake patients, no copy of real data.)
- Staging is **open to everyone** — password at nginx level and `noindex`.
- Scheduled jobs (nightly copy to Cloudflare, monitor, snapshots) must never run for staging: the nightly copy would
  overwrite the production Cloudflare copy.
- The nginx change for staging is on the production server: always `nginx -t` before reload and keep the old config.
- New releases can change the database schema on first use (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` in
  `src/server.js`); rolling back the code does not undo it — keep the pre-deploy database copy, try schema changes on staging first.
- GitHub Actions secrets (deploy key, build values) are entered by the owner; workflows never print values; the leak check runs first.

## Deferred (decided "not now")
- **Tablet app built from `android/`**: the workflow today writes the project from its own text. Plan: build `android/`
  as is, versionCode/versionName from the run, pinned Gradle wrapper, inputs `publish` (no = artifact only) and
  `version_code` for a comparison run; verify code/manifest/resources equal to today's 2.0 APK. *No workflow change for now.*
- **Permanent signing key**: every run signs with a new random debug key, so every update means uninstall + reinstall
  (device data such as login and consultant drafts are lost). Plan: the owner creates one keystore and adds it to GitHub
  Secrets; the build fails if it is missing (no fallback); tablets uninstall one last time. Best moment: together with the
  move from 1.x to 2.x, which needs an uninstall anyway.
- Tests: `t-m44bui` fails on Windows only (tests block Google Fonts, fallback Tahoma makes a table 13 px wider at phone
  width); serving the real font in tests would make Windows match Linux. `t-m41b` needs an old bundle (`OLD`) that is not
  in the repo.
