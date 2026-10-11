# Feedback-snapshot verification: October 11, 2026

This records the original feedback-only snapshot before integration. The current combined tree also changes lab files; see COMBINED-RELEASE.md for the final combined 53-test result and current limits.

Baseline: main `9f38f714d6fa2aa7fff90f8638af3a7468f4f8ba`. All 96 baseline file blobs were reconstructed and verified against GitHub's tree before editing. No baseline files were removed. All original lab HTML/JS/CSS and homepage assets remain byte-identical in this feedback package. Seven baseline files changed: Dockerfile, README.md, admin.html, assessment.js, feedback.html, package.json, server.js.

## Passed on final prepared source

Environment: Node.js v24.19.0, local synthetic fixtures only.

| Command/check | Result |
| --- | --- |
| `npm test` | 14 top-level tests passed: 12 backend/data tests plus 2 frontend test-file suites |
| Frontend DOM suite within `npm test` | 8 scenarios passed, including 60 initially unselected radios, all exact item/comment text, fail-closed preview, consent, N/A vs missing, clearing, lost-response retry key preservation, receipt, zero report, malformed report, login/unauthorized behavior, and print-width handler |
| Chart DOM/export suite within `npm test` | 16 cases passed: four logical widths, all 10 items, full wording, numeric denominators, N/A/missing, empty/all-zero states, text escaping and SVG serialization |
| `npm run test:legacy` | Original before/lab/after/back preview regression passed: baseline hiding/lock, tab restoration, comments, missing/N/A, reset, denied storage, no network APIs |
| `npm run test:review` | Independent 7-test adversarial suite passed, plus bootstrap, lost-response/429 retry, authentication-boundary, and schema/export-boundary regressions |
| `npm run check` | Syntax passed for 34 JavaScript files; all packaged .cjs review scripts also executed successfully |
| Source isolation | Explicit public asset routes remain available; server/config/test/database/dotfile paths blocked; privileged APIs require authentication |
| Static chart inspection | Clearly labeled synthetic SVGs were rasterized with Inkscape and visually inspected; no real dataset or browser screenshot is represented |

Important tested properties: secure default-off behavior; private SQLite/WAL/SHM permissions; actual close/reopen and HTTP restart persistence; fixed idempotency under uncertain response ->429->retry (one stored record); rejected unknown data fields; exact valid/N/A/missing totals; inclusive UTC filtering; study/version/lab isolation; SQL parameter binding; CSV quote/formula defense; comments/identity fields omitted from exports; logout and four-hour expiry; secure production cookie; two-concurrent-scrypt ceiling; immutable version/complete-consent snapshots; unsupported SQLite schema versions rejected without modifying the file; CSV study/generation provenance and fresh-query warning.

Two independently discovered defects were fixed before final verification: partial deployment settings prematurely freezing blank consent metadata, and retry re-keying after an uncertain successful POST followed by a 429. See INDEPENDENT-REVIEW.md for findings.

## Explicitly blocked or not run

- Full browser end-to-end verification, browser-native PNG downloads, downloaded CSV UI behavior, and browser print/save-as-PDF were **not run successfully**. Installed Chromium's required process socket was denied by the environment, including the permitted escalation attempt; the separate cloud browser could not reach the isolated local server. No restriction was bypassed.
- The synthetic PNG images are Inkscape rasterizations of renderer output. They demonstrate chart layout, not the browser's canvas exporter or the full dashboard UI.
- Production/Railway configuration, persistent-volume durability, reverse-proxy HTTPS/security, multi-user load, disk encryption, backup/restore, real researcher setup, retention/deletion/withdrawal execution, container image build, and a real deployment were not tested or performed.
- No real student responses were obtained, generated, submitted, migrated, or analyzed. Synthetic test records used temporary databases and were removed afterward.

## Rerun

Run `npm test`, `npm run test:legacy`, `npm run test:review`, and `npm run check` from the project root. No dependency installation is necessary. The UI tests use a small mocked DOM and are expressly not a substitute for Playwright/browser QA in an approved environment. Before collection, finish all production checks in DEPLOYMENT.md and real browser checks on desktop and mobile viewports.
