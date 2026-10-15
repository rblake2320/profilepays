# Static placement acceptance — 2026-10-14 (America/Chicago)

The tests used real local PostgreSQL 16 and AIHangout workerd/D1 with built browser assets.
They used synthetic accounts, fixed approved test images and test credits only. UTC timestamps
in JSON receipts fall on October 15. No production account or payment provider was changed.

## Observed acceptance

| Outcome | Scenario | Observation / retained evidence |
|---|---|---|
| Worked | Full timed placement | Actual 15-second API and 35-second browser runs; start follows readback; original profile returns; 100 test credits in two balanced ledger entries. `acceptance.json`, `browser-results.json`, `browser-receipt.json`. |
| Worked | Duplicate request | Replayed enrollment returns the same placement; settlement stays at two ledger entries. |
| Worked | Authorization and consent | Unauthenticated request 401; another participant's destination/receipt 404; wrong consent 400; public admin signup 400; self-review 403. |
| Worked | Participant stop | Original profile restored; zero award. |
| Worked | Sponsor stop | Only sampled covered time receives integer prorated test credits. |
| Worked | Last funded slot race | Two concurrent claimants produce one winner; spend remains exactly 100 within a 100-credit budget. |
| Worked | Revoked connection | Image removed; normal profile restored; ambiguous settlement held with no automatic credit. |
| Worked | Earlier content | Both preexisting post and response avatars show the approved PNG and restore afterward, observed as an unauthenticated viewer. |
| Worked | Phone browser/time | iPhone 13 WebKit emulation in Chicago/Tokyo and desktop time-zone/+24-hour clock changes preserve timing. Physical iPhone testing was not performed. |
| Worked | Broken image rendering | Aborted image request falls back to the normal avatar. |
| Worked | Session refresh | Two consecutive forced access-token failures recover through real rotating refresh tokens in the browser. |
| Worked | Worker outage | AIHangout removes the image without ProfilePays at the 120-second lease boundary; final measured polling observation 120,343 ms after stopping the worker. `recovery.json`. |
| Worked | Two-worker recovery | Two restarted reconcilers preserve the evidence gap; zero ledger rows before review. |
| Worked | Independent review | Operator resolves a hold to zero credits; exactly two balanced ledger rows; repeated review returns 409. |
| Worked | Owner override | The owner's changed live-profile setting survives cleanup; zero award. |
| Worked | Late sponsor cancellation | Cancellation after the deadline cannot downgrade completed service; award remains 100. |
| Worked | Corrupt image bytes | A loopback fault proxy returns altered PNG bytes from the real destination path. Verification records `Approved image bytes changed`, holds credit, and confirms restoration. |
| Worked | Local start and port guard | Clean runner starts all three services and checks expected HTTP statuses. A duplicate start refuses occupied port 8930. |

## Regression/build checks

- ProfilePays: 26 Jest tests passed across four suites; frontend TypeScript check passed.
- AIHangout: 63 tests passed across six real Worker/D1 suites; crucible checks passed.
- Backend, ProfilePays frontend, Worker bundle and AIHangout frontend built through
  `node scripts/static-build.mjs`. Browser tests use those built assets.
- These small fixture runs are not a throughput or multi-user capacity certification.

## Failures found and repaired during implementation

| Initial outcome | Diagnosis and repair | Retest |
|---|---|---|
| Failed — signup returned 500 | Existing JWT code supplied both payload `exp` and signing `expiresIn`. Kept one expiry authority. | Real signup/login and complete authenticated workflow passed. |
| Failed — connection button returned 415 | Bodyless Axios POST omitted JSON content type. Send an explicit JSON body; retain existing AIHangout request protection. | Browser created and connected the private grant. |
| Failed — blank local AIHangout after rebuild | Wrangler retained an older asset manifest while files were replaced. Restart after building; runner now checks readiness and refuses occupied ports. | Clean startup and browser render passed. |
| Failed — preexisting Jest harness | Missing root TypeScript, missing decorator compiler options and mocked-away TypeORM/Nest metadata prevented suites running. Restored real metadata and typed test doubles. | All 26 tests passed. |
| Failed — phone layout | Long test username overflowed the profile header. Added wrapping and responsive spacing. | Browser test checks no horizontal document overflow. |
| Failed — recovery-fixture cleanup | Test called nonexistent DELETE live-profile endpoint. Changed cleanup to the existing PUT with `profileId:null`. | Entire recovery suite rerun passed. |
| Blocked then recovered — WebKit setup | Playwright download completed but its Node extraction stalled. Verified downloaded ZIP and extracted it with Python into the intended browser directory. | WebKit launched and full mobile browser test passed. |
| Failed — repeat fixture setup rate limit | Repeated test setup reposted an existing fixture. Reuse and validate its stored ID without weakening rate limits. | Browser run uses preexisting post and response. |
| Failed — session rotation | The client discarded replacement refresh tokens and the backend DTO rejected its own 80-character tokens as non-UUIDs. Aligned validation with issued tokens, stored replacements and coalesced concurrent refresh requests. | Browser test forces two consecutive refreshes and continues the placement flow. |

## Dependency check / release blocker

Compatible dependency updates reduced the production audit from **31 advisories**
(including one critical) to **22: 0 critical, 9 high, 10 moderate, 3 low**.
The audit still fails; a public release requires the remaining framework/dependency remediation.
No production deployment was attempted. Full audit and build logs remain in private `.local/static-pilot/`.

## Screenshots

`profile-active.png` and `profile-restored.png` show the same profile before/after expiry.
`old-post-active.png` and `old-post-restored.png` show the same previously created content.
`iphone-active.png` and `iphone-restored.png` are WebKit emulation screenshots.
`participant-active.png` shows the consent, connection and placement-history UI.
Full private working receipts/logs remain available under `.local/static-pilot/`.
