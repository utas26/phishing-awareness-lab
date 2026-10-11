# UTAS-Ibra CyberLab: combined local preparation

Local, undeployed Option 2 preparation based on main `9f38f714d6fa2aa7fff90f8638af3a7468f4f8ba` (verified October 11, 2026). This is implementation preparation, **not ethics approval, a deployed research system, or evidence of student outcomes**.

This combined source also includes beginner concept previews, playback/accessibility fixes across all 12 labs, and a fixed-fictional phishing demonstration. See [combined release and approval scope](docs/COMBINED-RELEASE.md) and [all-lab review](docs/simulation-usability-review.md). Both original preparation snapshots remain separate.

## Run locally

Requires Node.js 24.14 or later within the 24.x line. No npm dependencies or installation step are needed.

```sh
npm test
npm run test:legacy
npm run test:review
npm run check
npm start
```

Open `http://localhost:3000/satisfaction.html`. With no environment settings, collection is disabled, the standalone form previews only, and researcher login is unavailable. The original `/feedback.html` before/after demo remains local to the browser tab and never submits research responses. All educational labs remain available without research participation.

Routes:
- `/satisfaction.html`: standalone ten-item satisfaction form and two optional comments
- `/research-login.html`: researcher login shell (disabled until configured)
- `/research-dashboard.html`: server-protected item-level report
- `/admin.html`: existing classroom simulation dashboard, now using configured authentication

The research code does not import legacy simulation records or combine knowledge scores with satisfaction ratings. No fabricated results or seeded research data are shipped.

## What is prepared

- Exact existing satisfaction wording and five agreement choices, explicit N/A, optional skips, clear-answer controls, and no preselected answers
- Immutable instrument snapshots, UTC dates, consent version, explicit study code, optional activity code, durable SQLite storage, and idempotent retries
- Protected response/completeness/N/A/missing counts, Q1 distribution and item-level 100% stacked Likert figures
- UTC date, activity, and instrument-version filters; versions are not pooled
- UTF-8 BOM CSVs suitable for Excel, local SVG/PNG figures, and browser print/save-as-PDF reporting
- Source-file allowlist; server/config/database/test files are not publicly served; researcher credentials are no longer hard-coded

See [deployment and approvals](docs/DEPLOYMENT.md), [data dictionary](docs/DATA-DICTIONARY.md), and [security/research limits](docs/RESEARCH-LIMITS.md), and [verification coverage](docs/VERIFICATION.md). No push or deployment has been performed.
