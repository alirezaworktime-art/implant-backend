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
