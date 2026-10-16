# Exploratory QA remediation — 2026-10-15

Live app release: `56b0c63`, https://profilepays.ultrarag.app, existing Spark-1 Docker host and PostgreSQL. Test credits only.

## Findings and shipped behavior

| Finding | Cause and correction | Live result |
|---|---|---|
| Company name lost | Form schema collected the name, but the auth payload, active signup DTO, active User entity and auth response omitted it. Added a nullable 200-character column via migration, advertiser-required trimmed validation, request/response mapping and Campaign Studio display. Existing accounts remain valid. | Worked: actual browser advertiser signup displays Browser QA & Company; separate API signup, fresh login and /users/me retain QA & Company. Missing, blank, oversized and object values reject with field errors. |
| Advertiser navigation | Shared header and unrestricted member routes exposed participant screens. Hide participant links for advertisers and redirect direct member URLs to Campaign Studio. | Worked: /placements, /earnings, /connections, /confirmation and /marketplace all redirect advertisers to /advertisers. Participant connection, reservation, history and receipt controls still work. |
| Repeated landing copy | All three cards used one literal string. Each card now describes its own action and outcome. | Worked: browser readback found three distinct descriptions. |
| Favicon 404 | HTML referenced an absent public asset. Added the SVG and versioned its reference to bypass previously cached failures. | Worked: both /favicon.svg and the document reference /favicon.svg?v=2 return 200; SVG MIME and contents checked. |
| Analytics CSP error | Cloudflare injected a script prohibited by the existing self-only CSP. HTML now sends no-store, no-transform to prevent injection. | Worked: live response and browser DOM contain no Cloudflare beacon script. Existing self-only CSP remains. Analytics is intentionally not collected through this injected beacon. |

Cloudflare documents the no-transform injection behavior: https://developers.cloudflare.com/web-analytics/get-started/ . No security allowlist was expanded.

## Full hosted placement results

Used only live_countdown_test and its existing question/answer at https://aihangout.ai/problem/290. No posts created and no real payments.

- Connected the existing test participant using a temporary AIHangout grant through the real Connections form. Created two test campaigns through the hosted campaign API.
- Browser preview required destination selection and explicit test-placement consent; reservation stayed disabled before consent.
- Normal completion: placement `228fb863-583f-48c2-be36-83661635baf2`, 60,000 / 60,000 ms covered, 26 observations, 100 test credits, two ledger entries, restored.
- Early stop: placement `79eeaf4a-1396-475e-a56b-120bcb74543a`, stopped through dashboard confirmation, 7,796 / 120,000 ms covered, five observations, zero award, two ledger entries, reserved credits released, restored.
- Both active image responses matched the uploaded approved creative hash. The already-open profile and both older-post avatars changed and restored without reload, with decoded image widths of 128.
- Original profile configuration was byte-for-byte equivalent as JSON to the baseline; restored countdown frame hashes changed, confirming motion resumed.
- Participant balance moved from 200 to 300; early stop added zero. Temporary grant revoked and both QA campaigns paused after verification.
- Mobile-sized browser rendering was checked at 390 x 844. This run did not operate the owner's physical iPhone.

Machine results, receipts and screenshots are in [qa-remediation-evidence](qa-remediation-evidence/). Private passwords, tokens and connection grants remain outside Git.

## Escape analysis and prevention

Earlier tests concentrated on member signup and placement lifecycle, missing advertiser identity persistence and role-specific navigation. Default middleware and missing public assets were not checked against the edge-modified HTML.

The sweep covered signup/login/profile responses, the active and legacy user definitions (legacy entity is not registered in AppModule), all shared navigation links and participant routes including confirmation, and actual public HTML/icon delivery.

- `node tests/signup-validation.cjs`: 32 validation, normalization, policy parity and safe-error checks.
- `node tests/workspace-contract.cjs`: renders the actual layout and role guard for member, advertiser and anonymous states; CI gate added.
- `node tests/qa-remediation-live.mjs`: advertiser round-trip and hostile company values, public favicon and edge/CSP contract. Creates a disposable advertiser test account.
- `node scripts/check-public-pilot.mjs`: deployed health/deep links, previews, auth/role boundaries, CORS, security headers and retained ledger checks.
- `tests/qa-lifecycle-live.mjs`: staged API setup, asset equality, receipts and cleanup alongside browser consent/reservation/stop actions. Supply the authorized test credential in process memory only for prepare; run active/verify for complete and early, then cleanup.

Local backend/frontend builds and clean Docker build passed. Release CI: https://github.com/rblake2320/profilepays/actions/runs/38828329917 . No unrelated dependency upgrades were included.

The physical iPhone walkthrough remains tracked separately under PP-7; these findings and hosted scenarios are completed.
