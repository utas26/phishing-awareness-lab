# Independent Option 2 server / research safety review

Reviewed 2026-10-11. Final rerun completed 2026-10-11 09:04 UTC. Local synthetic testing only. No source modifications by reviewer, real collection, production credential provisioning, uploads, pushes, or deployments.

## Outcome

Two actionable defects were found, reported, fixed by the implementation workers, and independently retested:

1. **P1: Retry after uncertain success could duplicate a response.** `satisfaction.js` cleared the idempotency payload on every HTTP 4xx. A committed POST whose acknowledgment was lost, followed by a 429 on retry, caused the next click to generate a new key. Real SQLite plus the actual submission-handler functions in a mocked-DOM VM reproduced two stored responses. The fixed code retains the original key/payload on errors. The same regression now produces exactly one stored response.
2. **P2: Incomplete deployment setup froze blank study metadata.** Opening a configured database with only study ID and consent version registered an incomplete immutable snapshot. Adding the missing study information on the next start made storage unavailable. The store now requires all study fields before registering the snapshot. The bootstrap regression remains ready after the missing fields are added; collection stays disabled until the entire configuration is valid.

No additional blocking auth, static-source exposure, SQL-injection, or counting defect was demonstrated in the tested code.

## Verification

- `node --test option2-review/server-adversarial.test.cjs`: **7/7 passed**.
- `node option2-review/config-bootstrap.cjs`: **passed** after fix; incomplete setup does not poison the database.
- `node option2-review/retry-after-429-vm.cjs`: **passed** after fix; lost acknowledgment -> 429 -> successful retry retains the original key and stores one response.
- `node option2-review/auth-boundaries.cjs`: **passed**; forged/malformed cookies fail, production cookie is Secure, concurrent scrypt work is limited, expired sessions are invalidated.
- `node option2-review/schema-export-boundaries.cjs`: **passed**; unsupported SQLite user versions -1, 2, and 2147483647 are rejected without any change to database bytes; CSV provenance columns are populated and the fresh-query caveat exists.
- Implementation `npm test`: **12/12 passed** on the final rerun.
- Implementation `npm run check`: **32 JavaScript files passed syntax checking** on the final rerun.

Coverage includes missing/insecure configuration; rejected public-root, relative, missing-parent, and memory database paths; default-off collection/login; server/config/auth/store/test/dotfile static blocking; absent consent, invalid fields and values; source-version checks; no identifying schema fields; same-origin/Fetch Metadata protection; authentication, logout, restart invalidation, and expiry; private database/WAL/SHM permissions; SQLite persistence after close/restart; transactional idempotency and conflict handling; exact numeric/N/A/missing counts; complete/partial/all-Likert counts; unknown participation denominators; safe coded and summary CSVs; repeated/unknown/malformed filters; inclusive UTC boundaries; study and lab isolation; immutable instrument and complete-consent snapshots.

The instrument preserves the original scale's null-valued N/A declaration. Current UI deliberately converts that declaration to the wire value `na`, while null remains missing. This was reviewed and is not an outstanding defect.

## Non-blocking notes / limits

- CSV routes intentionally requery at export time, while figures reflect the report response already loaded. New submissions may change CSV totals during active collection. The final UI explicitly discloses this. Summary CSV now includes study ID and generation time; coded CSV includes export generation time. These additions were verified.
- Research schema has no names, student IDs, IP, or password fields. Free-text comments can still contain user-entered identifying information despite the warning; avoid an absolute anonymity guarantee. Comments are omitted from standard reports and coded CSV exports.
- Legacy classroom telemetry is separately held in RAM and can still include names/IPs; it is excluded from the research dataset. Existing invented-password local-capture behavior is outside this change.
- Persistent-volume durability, TLS/reverse proxy, access logs, backup/restore, approved consent, retention, withdrawal operations, and external security review remain deployment responsibilities. Environment booleans cannot establish that these operational controls actually exist.
- Native Chromium launch failed with process socket EPERM, including the escalation attempt. Retry regression is actual-handler VM + local HTTP/SQLite coverage, not browser-rendering coverage. Full browser rendering/integration QA remains blocked and was not run. No further browser attempts or bypasses were made after the root instruction.

## Final reviewed hashes

- server.js: 397d34a3debad9466da4d070f84ebb0a93c7dcc9c1427530d5bba1f8f1e3d502
- research/auth.js: eb8bf7369017bcba09c1e07d5a18906b0fc9a15a6cd500cbfba424e4a5e402e2
- research/config.js: a9a67e4322138b016f61260e69f8a27b6143ac1a3a55b785f2879775fc8c4ddb
- research/data.js: 922623f7b021d392761707a2e1c5268a9b5fb6654d4b481b51bca0c0497d0010
- research/store.js: 31c2801ab03ba652b6724e07820066791c32c71d411d81d34f120a68beb63b5c
- research/instrument.json: 9ef664eee100cde70eff99b00cbd4929a09083ea0ca975526eb5185bf1d64389
- research/public-files.json: 3f8e66c55e15ee719b93d5d88549a24bae2083d6faf2dae149278677f826adea
- satisfaction.js: 3638249f8c2d11f5fc101e63c61c25f8d5fd819568543bec827ff32f3da9751e
- research-dashboard.js: f9194a59d7655e93df58cf944caa3982ab491e20186a5380b7e2c29d4b1fe716
- research-dashboard.html: 4756398024ce75886efcf23a60106857e6a56e41178c63fd2c818c5e0cb1a821

## Packaged verification

Reproducible scripts are included under `test/review/` with repository-relative paths. The final package also includes 8 frontend DOM scenarios and 16 chart checks; these do not replace full browser testing.
