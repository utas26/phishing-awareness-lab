# Beginner simulation review

Status: locally prepared; not published or deployed.

Base: `utas26/phishing-awareness-lab` main commit `9f38f714d6fa2aa7fff90f8638af3a7468f4f8ba`, independently checked through GitHub. All baseline files were verified by Git blob hashes before editing.

## What changed

The existing hands-on lab engines, live state-linked guides and mission evidence remain the source of actual exercise results. Eleven lab pages now offer a collapsed **Watch the idea** explanation with four authored scenes. Each scene has an action, result, plain-language reason and three-part diagram. Controls are Play, Pause, Back, Next and Restart. The preview never runs the exercise, records mission progress, sends requests or writes storage.

Playback starts only on request. Closing the panel, switching tabs or leaving pauses it. Reduced-motion mode is manual, and a live change to that preference stops automatic playback. Captions provide all meaning without audio. The layout uses a stacked small-screen arrangement and visible keyboard focus. These responsive/accessibility provisions are source-tested; real-browser visual validation is still outstanding.

DoS/DDoS already had a four-scene animation driven by its actual model. It keeps that player instead of receiving a second one.

## All 12 labs

| Lab | Beginner explanation | Specific additional fixes or preserved behavior |
| --- | --- | --- |
| Phishing | Suspicious message → real destination → imitation login → trusted route | Fixed fictional Stage 2 details, no editable credentials or raw-password storage, safe local result view, repeated-click guard, bounded event logging, Back/Forward protection and All labs navigation. |
| QR phishing | QR decoding, redirects, final hostname and recovery | Pause/Resume keyboard focus preserved; live reduced-motion and hidden-tab pausing; existing mission/evidence controls retained. |
| MFA fatigue | Unexpected approval, denial/report, sessions, own sign-in | Live reduced-motion and hidden-tab pause; accessible completed/not-completed checklist state; existing number-match mission retained. |
| Fake software update | Offer, download versus execution, containment, built-in updater | Live reduced-motion and hidden-tab pause; accessible checklist state; no real file download or execution added. |
| Browser permissions | Permission grant, clear versus revoke, task-specific access, cleanup | Live reduced-motion and hidden-tab pause; accessible checklist state; no real permission prompts added. |
| Suspicious URLs | Displayed label, hostname, redirects, independent verification | Same keyboard-focus and playback-interruption repairs as QR; existing comparisons and mission evidence retained. |
| Port scanning | Fictional hosts, service ports, reply meaning, evidence limits | Hidden-tab pauses for discovery and scan; existing live reduced-motion behavior retained; JavaScript-disabled notice added. |
| Wi-Fi auditing | Fictional network, candidate guesses, limited-list results, retesting | Live reduced-motion/hidden-tab pauses, including stale asynchronous digest protection; existing comparison and rotation mission retained. |
| DoS/DDoS | Existing normal/one-source/distributed/protected scenes | Previous scene revisits without clearing report evidence; advanced mode starts paused under reduced motion; hidden-tab and live preference pauses. |
| SQL injection | Category value, unsafe concatenation, separate parameter, comparison | Immediate-run engine and same-input comparisons preserved. The new preview does not manufacture query results. |
| XSS | Comment input, unsafe interpretation, text output, comparison | Inert preview and same-input comparisons preserved. No student script execution added. |
| Password strength | Invented sample, length, predictable patterns, safer habits | Existing limited-claim checker preserved; JavaScript-disabled notice added. The preview makes no password-safety guarantee. |

The shared guide-motion toggle now explains when the system reduced-motion preference overrides it, instead of appearing unresponsive.

## Phishing data boundary

Stage 2 uses static public teaching values: Demo Student and TrainingOnly!123. The handler reads neither displayed credential field. It preserves the existing classroom endpoint contract using constant demo identity and length plus the pre-existing browser/device metadata, which is now explained next to the button. The new local key `phishlab_demo_result_v1` contains only version/demo identifiers, timestamp, completion flag and server-response status.

The old raw-credential storage key is neither read nor automatically cleared. Previously saved browser data is left untouched. The local view reads only the new versioned record, displays allowlisted status, and clears only that new record when the learner explicitly presses the clear control. None of these changes has been deployed, so the live site has not yet changed.

## Verification

Run from the repository root:

```sh
node --test test/lab-explanation.test.js test/lab-playback-accessibility.test.js test/lab-routes.test.js test/phishing-demo-safety.test.js test/phishing-navigation.test.js
git diff --check
```

Result: **37/37 Node tests passed**, including **95 focused engine/guide assertions** inside the playback regression test. Coverage includes:
- Four-scene boundaries and repeated/reset/replay flows across all 11 previews
- Timer cancellation, stale callbacks, manual stepping, reduced-motion changes and hidden-tab interruption
- Focus restoration after Pause/Resume, completed exercises and hidden-guidance mission mode
- DoS previous-scene evidence/baseline retention
- Wi-Fi interruption during an asynchronous check
- Fixed phishing constants, raw-credential exclusion, legacy-storage isolation, storage failure, error/timeout/retry and repeated submissions
- All 12 catalog routes, their local assets, duplicate IDs/includes and application/inline-script parsing

No dependency was installed. No external service received test data. All new tests use local fixtures and built-in Node APIs.

### Not verified

Real-browser desktop/mobile rendering, visual screenshots, real assistive-technology behavior and full end-to-end browser execution were not run. The executor's Chromium process failed when creating its required socket (`Operation not permitted`). The separate cloud browser could not reach this executor's localhost (`ERR_CONNECTION_REFUSED`). These checks remain a pre-publication requirement, not a claimed pass.

Suggested browser acceptance: open every catalog route at desktop and narrow mobile widths; expand the explanation; use keyboard Play/Pause/Back/Next/Restart; complete and reset each actual exercise; test reduced motion, tab hiding, Back/Forward and the independent-mission mode; confirm no overflow or hidden/disabled focus target; inspect the fixed phishing demo's network payload and safe local result.

## Integration

Apply only the changed-file manifest from this review over the separately prepared feedback/research source. This work does not modify `server.js`, `package.json`, `Dockerfile`, `admin.html`, `feedback.html`, `assessment.js` or research modules. The new test and documentation filenames are distinct.

Rerun the combined tree's syntax, tests, feedback/database/HTTP regressions and these 37 lab tests. Preserve both source snapshots. Publication/deployment needs separate authorization and should follow the outstanding real-browser checks.
