# Data dictionary and analysis rules

Instrument: `utas-cyberlab-satisfaction-draft-1.0`. This is a standalone administration of the exact ten satisfaction statements and two comments inherited from draft `utas-cyberlab-draft-2.0`. Its new version records the changed workflow and ID mapping, not validation. Each item stores its original `sourceId` in the immutable instrument definition. The old pre/post instrument remains unchanged and local-only.

## Research database

Each submitted form has a random `response_id`, a non-person `study_id`, `instrument_version`, `consent_version`, server-generated `submitted_at_utc`, an optional allowlisted `lab_id`, q1–q10 answers, and two optional comments (`usefulPart`, `improvement`). A random submission key and canonical payload digest support retry idempotence but are not exported. Names, student IDs, email addresses, IP addresses, user agents, raw passwords, device data, and demographic fields are not part of this schema. Unexpected request fields are rejected, not copied into storage.

Free-text comments can still accidentally contain identifying information despite the on-form warning. They are stored separately in the private database record and excluded from both CSV exports and automated reports. Authorized human review and de-identification are required before quotation, coding or sharing. The package does not claim automatic text anonymization.

## Item mapping

| Export key | Exact item wording |
| --- | --- |
| q1 | Overall, I am satisfied with this learning experience. |
| q2 | It was easy to find my way around the application. |
| q3 | The activity instructions were easy to understand. |
| q4 | The on-screen information was easy to read. |
| q5 | The feedback clearly explained the result of my choices. |
| q6 | The activities held my attention. |
| q7 | The level of challenge was appropriate for me. |
| q8 | The scenarios were relevant to situations I may encounter. |
| q9 | The learning experience was useful for learning cybersecurity concepts. |
| q10 | I would choose to use these learning activities for further practice. |

Optional comments are exactly: “What helped your learning most, and why?” and “What was confusing, or what one change would improve the learning experience?”

## Response coding

- Numeric 1: Strongly disagree; 2: Disagree; 3: Neither agree nor disagree; 4: Agree; 5: Strongly agree.
- Explicit N/A is the string `na` internally and `NA` in coded CSV.
- Unanswered/skipped is JSON null internally and blank in coded CSV. It is not zero, neutral, disagreement, N/A, or an incorrect answer.
- `item_complete=1`: all ten items recorded as numeric or explicit N/A. Comments and lab selection are not required.
- `all_likert=1`: all ten items have numeric 1–5 answers. Ten N/A responses are item-complete but not all-Likert.
- `partial`: at least one of the ten items is skipped. Every accepted submission is retained, including one with all items skipped. Consent does not require substantive answers.

## CSV exports

Coded response CSV fields:
`export_generated_at_utc,response_id,study_id,instrument_version,consent_version,submitted_at_utc,lab_id,q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,item_complete,all_likert`

Summary CSV fields:
`study_id,generated_at_utc,instrument_version,from_utc,to_utc,lab_id,item_id,item_text,numeric_n,count_1,count_2,count_3,count_4,count_5,na_n,missing_n,agree_n,agree_pct`

CSV downloads rerun the current filters and can include newer submissions than an earlier on-screen report while collection is active. Export timestamps identify each CSV generation; refresh before comparing. This implementation does not freeze a database snapshot across separate downloads.

Both files use UTF-8 BOM and CRLF for common Excel workflows. All cells are quoted and quotes doubled; possible formula-leading strings (including after whitespace) receive a leading apostrophe. The exports do not contain comments, submission keys, authentication values, or the legacy teaching records.

These are coded/de-identified exports, not a guarantee of anonymity. Exact date/time, small activity groups and externally known participation can create re-identification risk. Minimize exported columns and suppress small cells in publication under the institution's policy. Permission to run a report is not permission to publish or share individual-level data.

## Calculations and flow diagram

The denominator for a Likert percentage and each 100% stacked item bar is that item's numeric 1–5 count. N/A and missing are separate counts, excluded from that denominator. Q1 is an overall-satisfaction agreement item and is shown separately. Agreement percentage is `(count_4 + count_5) / numeric_n × 100`; when numeric_n is zero it is undefined/null and exported blank, not 0%.

`responses` counts accepted submitted forms after date/lab/version filters, not verified unique students. A retry with the same submission key returns the same response and does not inflate counts. Reloading or deliberately making a new submission can produce another response; there is no identity collection or cross-device deduplication. Decide an ethics-compatible sampling/duplicate-handling protocol before the study.

Consents displayed in the flow mean consent attached to submitted forms. The software does not count every consent click, form opening, invitation, eligibility assessment, decline, or abandonment. Those denominators remain unknown. No response rate is derived. `excluded=0` means no automatic exclusion rule has been applied; it does not claim that every form represents an eligible distinct person. Item-level analysis uses each item's own valid count.

Date filters are UTC and inclusive of the selected start/end days. Lab filters include “Not specified” for null. The study ID is the configured study only. Exactly one instrument version is analyzed at a time; versions are not automatically pooled.

The dashboard does not calculate a validated composite, Cronbach alpha, significance tests, pre/post gain or causal learning effect. These ten items cover multiple concepts; validation, study design and analysis planning remain institution/researcher work.
