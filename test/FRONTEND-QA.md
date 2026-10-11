# Frontend checks

Run from the repository root with Node.js:

    node --test test/frontend-dom.test.js test/research-charts-dom.test.js

These are included automatically in `npm test`.

- `frontend-dom.test.js`: eight grouped DOM flow scenarios covering 60 initially unselected radios; all ten original statement texts and both comment prompts; preview and offline no-submission behavior; invalid-config fail-closed behavior; consent; N/A versus missing; unchanged idempotent payload through network failure, HTTP 429, HTTP 409 and success; receipt handling; zero-data reports; study provenance; print-width rendering; malformed reports; access redirects; and login.
- `research-charts-dom.test.js`: sixteen renderer/export cases across 1080, 740, 380 and 340 logical pixels; item wording; numeric denominators; separate N/A/missing; unknown participation stages; empty states; SVG export; escaping; and rejected unsupported formats.

The tests use a small local DOM adapter. They do not substitute for browser accessibility, layout, interactive PNG-download, or print/PDF acceptance tests. Full-browser verification was unavailable in the preparation environment. Do not treat those stages as passed.

## Optional illustrative figures

Generate SVG fixtures outside the source tree:

    RESEARCH_QA_ARTIFACT_DIR=../feedback-option2-artifacts node test/research-charts-dom.test.js

Fixtures use `research/instrument.json` for verbatim statements and version. Every chart says `SYNTHETIC QA ONLY` and `No real student responses`. Counts are artificial renderer fixtures, not study records. The intentionally inconsistent `valid` property in the fixture tests that the renderer calculates its denominator from the five numeric counts.

The supplied PNG previews were rasterized from these SVGs with Inkscape. For example:

    inkscape ../feedback-option2-artifacts/synthetic-qa-likert-1080.svg --export-type=png --export-filename=../feedback-option2-artifacts/synthetic-qa-likert-desktop.png

They are figure previews, not full-page screenshots and not a verification of the browser's PNG download implementation. No live or production dataset was used.
