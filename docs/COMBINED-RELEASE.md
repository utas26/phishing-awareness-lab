# Combined local release: feedback and beginner simulations

Prepared locally on October 11, 2026 against `utas26/phishing-awareness-lab` main `9f38f714d6fa2aa7fff90f8638af3a7468f4f8ba`. GitHub main was rechecked at integration and still matched this baseline. Nothing has been pushed, deployed, or activated.

## Integration

The independently tested feedback preparation was copied into a new combined tree. Exactly the lab preparation's 28 SHA-256-verified changed/new files were then copied in; there were no overlapping file edits. The two new browser assets, `lab-explanation.js` and `lab-explanation.css`, were explicitly added to the secure static-file allowlist. No wildcard source serving was reintroduced. Two HTTP integration tests were added.

The original feedback source/manifest and lab source/manifest remain unchanged. The combined manifest identifies every file, whether it was modified or added, its SHA-256, and its baseline Git blob hash.

## Final combined checks

Run from this project root:

```sh
npm test
npm run test:legacy
npm run test:review
npm run check
```

All passed on Node.js v24.19.0:
- `npm test`: 53 top-level tests: the feedback package's 12 backend/data tests and two frontend suite entries (8 DOM scenarios plus 16 chart cases), the lab package's 37 tests (including 95 focused engine/guide assertions), and two new integration tests.
- Integration checks: all 12 lab routes and local assets are served by the hardened server; the fixed classroom demo contract works and remains outside the research dataset; research remains disabled without configuration.
- Independent adversarial suite: seven tests, plus bootstrap, uncertain-response/429 retry, authentication-boundary and schema/export-boundary scripts.
- Original before/lab/after questionnaire regression.
- Syntax: 41 JavaScript files; `.cjs` verification scripts were also executed.

Full browser desktop/mobile/assistive-technology acceptance, browser-native PNG/PDF/download behavior, container image build, and real production storage/TLS/backup checks remain unrun. The environment blocked Chromium's required socket, and the separate cloud browser could not reach the isolated local server. These limits must be disclosed; static SVG images are synthetic test figures, not browser screenshots or student results.

## Minimal prerequisites for a disabled release

No research database, volume, paid service, institutional enrollment setup or new credential is needed to ship **disabled previews only**. Before publication:
1. Obtain explicit approval for the exact combined changed files on GitHub main and deployment of that exact resulting commit to the existing Railway service.
2. Explicitly disclose and obtain approval for the live security change: the embedded old admin login will stop working; researcher/admin login is unavailable until secure environment credentials are separately configured. No replacement production credential is included.
3. Address current temporary records before restarting. Any existing RAM-only classroom/legacy-feedback records disappear on process restart/deployment. This preparation did not inspect or preserve the running process's records; do not assume none exist. Preserve anything needed through an authorized procedure before deployment.
4. Complete or explicitly resolve the outstanding browser acceptance and Node24/non-root-container smoke checks in an approved environment. The proposed Dockerfile uses Node24 and the non-root `node` user.
5. Recheck current main and reconcile unrelated changes. Review Railway's staged changes individually. Do not accept the obsolete commit pin or unrelated staged configuration as part of this release. Deploy only the approved new commit through a supported flow.
6. Keep `RESEARCH_COLLECTION_ENABLED` disabled/unset, keep institution approval flags unset, and do not configure a research database or credentials as a side effect.

With no research configuration: the existing activities and local previews work; `/satisfaction.html` does not submit; research POST returns503; old unversioned feedback POST returns410; administrator login returns503; protected reports require login and cannot expose records. This does not turn off the separately existing classroom simulation endpoint, which now receives fixed fictional identity and the existing disclosed device metadata through the new phishing UI. The questionnaire does not collect this metadata.

## Proposed bounded authorization wording

“Publish the exact reviewed combined file set to `utas26/phishing-awareness-lab` main and deploy that new commit to the existing Railway app with research collection disabled. This removes the old built-in admin login, so admin access will remain unavailable until a separate secure setup. Resolve any current RAM-only records before restart. Do not activate research, create credentials or paid storage, or accept the older staged commit pin/unrelated configuration.”

This is a proposed scope only, not an authorization already granted. Production credential setup and real research activation need later approval and the full institutional/storage/security checklist in DEPLOYMENT.md.

## Phishing privacy change and limits

The integrated phishing demo uses fixed public fictional details and no editable credential fields. Its script does not read, store or transmit a password value. The new local result stores only version/demo identifiers, time, completion and server status. Historical raw-credential localStorage, if present from an older version, is not read, overwritten or silently deleted by this release. The old server-side RAM records, if any, remain a separate restart/preservation issue described above.
