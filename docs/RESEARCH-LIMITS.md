# Research and security limits

This is a bounded preparation, not a certification or guarantee of publication readiness.

- Institution-approved consent, study design, piloting, recruitment, eligibility, sample-size reasoning, missing-data rules and reporting choices remain necessary. Existing statements are positively worded and span several constructs; they are not one demonstrated validated satisfaction scale. Q1 is agreement with an overall-satisfaction statement; Q10 is future-use intention.
- Knowledge and self-rated understanding are not part of this dataset. The legacy local pre/post demo still repeats the same knowledge questions and can show practice effects; no causal inference is supported by this satisfaction report.
- Protected login uses one configured researcher account for the scoped dashboard. It does not provide per-researcher accounts, MFA, institutional SSO, granular roles, administrative audit trails, automated retention enforcement or automated withdrawals. Those operational requirements must be resolved in the institutional review before collection; an identity gateway or additional implementation may be needed.
- Login and submission throttles are process-local safeguards, not distributed bot protection. Deliberate repeat submissions cannot be linked to unique people. Sessions end on restart and expire after four hours.
- The database has private file permissions and is outside the public root. Platform disk encryption, privileged access, mounting durability, backups, host logs, patch management, and retention are operator responsibilities and require separate verification. No real platform integration has been tested or provisioned.
- The public static allowlist protects source/database files. It does not retroactively remove a previously published credential from Git history or invalidate old live sessions. Real credential rotation and history treatment need a separately authorized security procedure.
- Existing classroom simulation data remains temporary and separate. Research pages never combine it with satisfaction responses. The combined phishing UI now uses fixed fictional details. Its separate classroom endpoint still handles disclosed connection/device metadata; the standalone research form does not. Historical browser data is not silently purged.
- Comments may contain identifiers. Do not publish them or include them in automated exports without human review and de-identification. No claim of guaranteed anonymity is made.

## Receipt-based withdrawal limits

A successful submission returns a random response reference. It is a response lookup reference, not a participant identity or authentication credential. The configured withdrawal wording should explain the approved contact route and whether the participant should retain this reference. The application itself does not record identity and therefore cannot reliably find one person's record if the reference is lost. A participant cannot be identified through the receipt alone.

Deletion is not exposed as an unprotected public endpoint. An authorized researcher/operator must follow the approved maintenance process, check the request and target record, apply retention/withdrawal rules, and consider backups and already published aggregates. No claim is made that withdrawal is always possible after aggregation or publication. This manual workflow, access authorization and backup consequences must be defined and tested before enabling collection.

## Source and verification references

- Baseline: https://github.com/utas26/phishing-awareness-lab/commit/9f38f714d6fa2aa7fff90f8638af3a7468f4f8ba
- Original instrument: https://github.com/utas26/phishing-awareness-lab/blob/9f38f714d6fa2aa7fff90f8638af3a7468f4f8ba/assessment-items.js
- Node SQLite APIs: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Node cryptography APIs: https://nodejs.org/api/crypto.html
