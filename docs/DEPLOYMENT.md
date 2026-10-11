# Release and activation checklist

For this combined package, also follow COMBINED-RELEASE.md, including explicit approval of the admin-login change and preservation of any current RAM-only records before restart.

## Current status

This is a local preparation. Research collection is disabled unless every required gate is configured. No cloud resources, persistent access, live credentials, paid service, GitHub commit/push or Railway deployment was created or changed. The existing Railway staged changes include an older commit pin and must **not** be accepted wholesale; this package does not touch them.

## A disabled release can ship without research credentials

After explicit publication/deployment approval, the static allowlist, removal of built-in admin credentials, retired legacy feedback writes, original learning labs, local-only questionnaire previews, and disabled standalone satisfaction form can be deployed without any researcher credential or research volume. No new data store is then opened. Researcher login remains unavailable. This closes the old public source-file path but is a breaking authentication change, as intended.

A disabled release still changes the runtime to Node 24 and changes the Docker process to the non-root `node` user. Test a clean image and the approved platform setup before deploying. Local Node 24 tests are not a container-build test. Do not silently accept staged Railway changes.

## Before enabling real collection

1. Institution decisions and documented approval: research purpose, eligibility, voluntary participation with no grade penalty, consent process, ethics approval or formally documented exemption, sample/recruitment plan, researcher identity/contact, retention period, withdrawal limits, and authorization of the storage location/hosting jurisdiction.
2. Explicit user approval for publication/deployment and activation. Preparation approval does not authorize collecting real student responses.
3. User/operator-managed secure credentials: configure `ADMIN_USERNAME`, `ADMIN_PASSWORD_SALT`, and `ADMIN_PASSWORD_SCRYPT` through the hosting platform's approved secret entry flow. Do not put passwords, hashes, or salts in Git, frontend code, chat, screenshots, or files delivered to students. Password hash contract: scrypt, 64-byte key, hexadecimal salt of at least 16 bytes, N=131072, r=8, p=1, maxmem=256 MiB. Existing live authentication is not configured by this package. A proper institutional identity/SSO gateway is strongly recommended for public exposure; it would need separate configuration and approval.
4. HTTPS only in production. Set exact `APP_ORIGIN`, with no trailing slash or path. Match the final public domain and proxy routing. The research pages use strict self-only CSP. Authentication uses HTTP-only, Secure (on HTTPS/production), SameSite=Strict cookies and four-hour server-side expiry. Sessions are intentionally invalid after restart; they are not research data.
5. Approved durable storage: an existing persistent volume, mounted outside `/app`, writable by the app's non-root user. Set the absolute `RESEARCH_DATABASE_PATH`, such as the operator-selected mounted directory plus `research.sqlite`. Its directory must already exist; the app does not provision volumes or change existing permissions. `RESEARCH_PERSISTENT_VOLUME_CONFIRMED=true` is an operator assertion, not automatic verification of the platform. Never use the container's ephemeral disk, `/tmp`, the source tree, or a network filesystem for production research data.
6. Single application replica for this SQLite design. SQLite WAL plus full synchronous commits protects application-level persistence; it is not a backup or high-availability system. Do not scale this app horizontally with separate disks. Use an explicitly approved shared database migration before multiple replicas.
7. Verify private file permissions and platform encryption at rest; restrict platform/volume access to authorized researchers. SQLite itself is not encrypted by this app. Confirm daily backup/restore practice, retention/deletion procedure, and handling of backups. Use a consistent SQLite backup or a stopped-app snapshot, not an arbitrary live copy of only the main `.sqlite` file while WAL is active.
8. Review reverse-proxy and hosting logs. The research schema does not store IPs, user agents, names or student IDs. Hosting services can still log connections. The existing teaching simulations are separate and may hold names/connection metadata temporarily. This app cannot promise anonymity for the whole site.
9. Test end-to-end submission, consent display, refusal/skip paths, duplicate retry, restart persistence, researcher login/logout, authorization failures, filtered exports, CSV safety, backups/restore, and deletion/withdrawal handling using clearly isolated synthetic test records before real enrollment. Remove test fixtures from any collection environment using an authorized maintenance procedure.
10. Set all required non-secret study settings listed below, and only after the above steps set the four explicit acknowledgments/enablement flags. A missing or invalid setting prevents collection.

## Non-secret study and operational settings

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact HTTPS origin in production; loopback HTTP accepted only outside production |
| `RESEARCH_DATABASE_PATH` | Absolute private database file path on approved persistent volume outside public/source tree |
| `RESEARCH_PERSISTENT_VOLUME_CONFIRMED` | Must be `true` after the operator verifies mount durability |
| `STUDY_ID` | Stable non-person study code, 1–80 letters/digits/underscore/hyphen |
| `CONSENT_VERSION` | Version identifier for the institution-approved information/consent process |
| `STUDY_INFORMATION` | Participant information and purpose, as approved by the institution |
| `STUDY_CONSENT_TEXT` | Explicit voluntary consent wording, as approved |
| `STUDY_ETHICS_REFERENCE` | Actual institutional approval/exemption reference; not a placeholder |
| `RESEARCHER_CONTACT` | Real authorized researcher and contact route |
| `STUDY_ELIGIBILITY` | Approved eligibility requirements |
| `STUDY_RETENTION` | Approved retention period and data handling |
| `STUDY_WITHDRAWAL` | Actual withdrawal process and limits, including receipt loss and publication limits |
| `RESEARCH_ETHICS_APPROVED` | Must be `true` only after institutional requirements are met |
| `RESEARCH_SECURITY_REVIEWED` | Must be `true` after storage, access, logs, backups and retention review |
| `RESEARCH_COLLECTION_ENABLED` | Defaults disabled; `true` is necessary but never sufficient by itself |

The app cannot independently verify the truth or adequacy of institutional text/flags. Operators are accountable for them. Changing instrument wording under an existing instrument version is rejected. Changing stored study information under the same consent version is rejected; issue a new consent version.

## Cost and operations

No new resource has been provisioned. Production persistence will require an approved durable volume or a separately designed managed database, which may incur hosting/backup charges. Pricing has not been quoted or approved. This implementation uses SQLite in Node.js with no npm runtime dependencies. It does not include email, new third-party analytics, or paid charting services.

## Breaking security changes to disclose

- Previous hard-coded researcher/admin login will stop working. No replacement production credential is included.
- `POST /api/feedback` now returns 410. That legacy unversioned, identity-bearing RAM endpoint is retired.
- Legacy feedback was not migrated and cannot be recovered by this code from a past process's memory. It is never presented as a current research dataset.
- Server/config/source/README/database/test files return 404; only explicit public assets are served.
- Teaching simulation write requests must be same-origin. Arbitrary forwarded IP headers are no longer trusted; its displayed connection IP may be the hosting proxy, not a student's public IP. Participant bodies are no longer written to application console logs.
- Node 24 runtime and non-root Docker user replace Node 20/root; mounted-volume ownership must be set through an authorized operator procedure.

## Publication procedure after approval

Verify current main has not changed, review the release manifest against this baseline, re-run checks and regression tests, review exact changed files, build/test the container, and publish only the approved release commit. On Railway, inspect each existing staged change and the target commit rather than accepting all. Keep collection disabled until the separate activation checklist is completed. Verify the exact deployed commit and health/readiness by testing the disabled/active states as authorized. Rollback must preserve the durable volume and cannot restore unsafe old authentication without explicit review.
