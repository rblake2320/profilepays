# ProfilePays workspace — 2026-10-15

The original ProfilePays flow is implemented as a working local test-credit pilot: advertiser creative library → campaign review → marketplace → participant preview and explicit consent → timed assignment → verification → restoration → settlement. Glimpse Rush stays separate.

## Original sources

- [Wireframe PDF](https://drive.google.com/file/d/1JcAFUIekfXrsIm85jydMBXJ1U-GmjK9s/view): six screens covering the landing page, advertiser upload/library, marketplace, about, how-it-works and confirmation with destinations.
- [How ProfilePays works](https://docs.google.com/document/d/1KjYae19a6WimMoZJv5NKPJxQd__7jENC/edit)
- [Original skill sets](https://docs.google.com/document/d/1uqFFsHLqAZBYbW50m6oLilbTsLbzNgV4/edit)
- [Executive summary](https://drive.google.com/file/d/1wzvbuYxN0EfQw3gEiytf-F2mxEVUX1bZ/view)

The historical material includes cash fees/escrow, subscriptions and donations. This pilot uses test credits with no cash value; it does not execute those money flows. No AI agent is required to use it.

## Each person's part

| Role | Working surface | Responsibilities |
|---|---|---|
| Advertiser | `/advertisers` | Upload and inspect a cropped creative, review immutable offer terms, publish, inspect participation/budget, pause new enrollment or cancel an active placement under the terms. |
| Participant | `/marketplace`, `/confirmation`, `/connections` | Search/filter/save offers, privately connect AIHangout, inspect the image and terms, explicitly opt in. |
| Participant | `/placements`, `/earnings` | See server-timed progress, sampled verified time, receipt and test-credit history; stop early and restore the original profile. |
| Independent operator | `/reviews` | Inspect held evidence, enter a bounded credit award and reason, settle once. A participant or sponsor cannot adjudicate their own placement even if they also have the operator role. |
| Public viewer | AIHangout profile and existing question/answer | Receive current imagery automatically; fall back to the normal profile on image failure; see the original profile when the placement ends. |

Custom images are normalized to 128×128 PNG, content hashed, owned by the advertiser, frozen into campaign terms, and independently fetched/hash-checked during verification. Pausing a campaign blocks new enrollment while preserving existing placements. Consent and test-credit terms remain explicit.

Verified time is the interval supported by consecutive destination/image observations within the allowed sampling gap. It advances during the placement. It is **not audience impressions or proof that a human watched continuously**. Browser timings below are measured acceptance samples, not traffic analytics or latency guarantees.

## Observed acceptance

| Scenario | Outcome and measurement | Evidence |
|---|---|---|
| Custom asset lifecycle | Worked: upload/deduplication, ownership rejection, persistent favorites, bad hash rejection; 15 seconds, 8 observations, 120 test credits and original profile restored | `workspace-evidence/creative-results.json` |
| Full browser lifecycle | Worked: real upload/publish/connect/consent, public profile and two older avatars, Chicago/Tokyo iPhone-sized WebKit, +24h device clock change, failed-image fallback; 35,000 ms coverage, 100 test credits, exactly 2 balanced ledger entries | `workspace-evidence/creative-browser-results.json` |
| Automatic updates | Worked: already-open profile and both older avatars updated within 3,051 ms in the measured run; fresh profile image loaded in 297 ms | `workspace-evidence/role-results.json` |
| Early participant removal | Worked: zero award, original profile and both older avatars restored without reload within 3,300 ms | `workspace-evidence/role-results.json` |
| Operator controls | Worked: ordinary member redirected away from review screen, unrelated receipt denied, participant/sponsor self-review denied even with admin role, independent UI review settled once, duplicate returned 409 | `workspace-evidence/role-results.json` |
| Live countdown on aihangout.ai | Worked: profile plus earlier question/answer tick, three viewer time zones agree, owner-zone update reaches mounted avatars, unlink/relink and 35-second outage recovery; original test settings restored | `workspace-evidence/countdown-browser.json` |
| Countdown image bytes | Worked: 22 frames / 22 distinct seconds over 20.8 seconds, zero decoded time mismatches, max frame age 169 ms, first frame 89 ms from stream request | `workspace-evidence/countdown-stream.json` |

Physical iPhone handling was not performed; phone checks above use Playwright WebKit emulation. The existing live countdown profile is https://aihangout.ai/profile/live_countdown_test and its older post is https://aihangout.ai/problem/290.

Repairs found during acceptance: old-post avatar layout could collapse behind its label despite decoded image bytes; campaign status mutation misread TypeORM's return shape; verified-time display stayed zero until settlement; the operator ownership check omitted the sponsor ID. Retests exercise actual receiving UI and negative authorization outcomes.

Build and source checks: all four application builds passed; ProfilePays frontend type check passed; 26 Jest tests in four suites passed; AIHangout's 63 real Worker/D1 tests and crucible checks passed earlier in this workspace update. Jest reports remaining asynchronous handles after the successful suite. Dependency audit still reports the pre-existing production dependency findings (22 total, 9 high, 0 critical); this is not a security release certification.

## Run and inspect

Follow [STATIC-PILOT.md](STATIC-PILOT.md). Canonical workspace on this host is `D:\OneDrive\Documents\ChatGPT\motion  pdrofile\profilepays`.

- Web: http://127.0.0.1:8930/marketplace
- Local AIHangout: http://127.0.0.1:8932
- Start: `node scripts/static-pilot.mjs` (keep running)
- Demo offers: `node scripts/seed-workspace-demo.mjs`
- Acceptance: `node tests/creative-workspace.mjs`, `node tests/creative-browser.mjs`, `node tests/workspace-roles.mjs`
- Read-only public image test: `node tests/countdown-live-stream.mjs`
- Public countdown browser test: `tests/countdown-live-browser.mjs` uses the existing designated test identity and process-only credentials; it restores the original link/zone/reporter in `finally`.

Do not stop the preview and leave it offline while doing unrelated work. Build replacements first, schedule any required restart immediately after the build, and reopen the browser before claiming recovery. The preview is local to this computer, not an iPhone-accessible public deployment.

## Jira and release boundary

[ProfilePays epic PP-1](https://rob47595-1791122756383.atlassian.net/browse/PP-1) is In Progress. PP-2 advertiser, PP-3 participant, PP-4 operator and PP-5 live countdown cover the tested work. [PP-6](https://rob47595-1791122756383.atlassian.net/browse/PP-6) tracks the separate production static-placement release.

The AIHangout static connector was deployed with explicit owner approval on 2026-10-15. Production version `4b4539bf-85bf-48dd-a80c-5a4f36a80097` passed 15/15 deployment checks. The release was isolated from baseline `7cd65fe` to exclude unrelated unpublished signup/chat/bug-report changes. ProfilePays coordination, dashboards and test-credit ledger run locally in an isolated pilot database; the destination profile and older question/answer are the actual public AIHangout site.

Live acceptance **Worked**: 45,000 ms verified coverage and 100 test credits on completion; early participant removal after 5,531 ms verified coverage awarded zero and restored the original countdown within 3,858 ms; direct AIHangout revocation restored within 2,614 ms, held settlement, and an independent operator released the reservation with zero award. Duplicate review returned 409 and participant self-review returned 403. All original profile settings were preserved, all pilot campaigns paused, and the temporary grant revoked.

See [production pilot evidence and reproduction](PRODUCTION-PILOT.md). PP-6 is being updated with the final live receipts. The normal local preview remains available on port 8930; the production-destination pilot dashboard is on port 8940. No real money changed hands.