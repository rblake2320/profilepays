# AIHangout production placement pilot — 2026-10-15

Owner explicitly authorized deployment and live testing on the designated test profile, including early removal and restoration, and updating Jira.

Public destination: https://aihangout.ai/profile/live_countdown_test

Preexisting question and answer: https://aihangout.ai/problem/290

The original profile is live countdown `d7d3e530-9b0b-4b54-a162-31dbc7445f3a`. Static placements overlay it without rewriting the underlying profile. Restoration was checked visually on already-open profile/question/answer pages and by comparing the original profile key. The restored countdown visibly advanced across repeated screenshots.

| Scenario | Observed result | Evidence |
|---|---|---|
| Sponsor custom PNG, private connection, explicit consent | Worked; normalized 128px image hash matched public bytes; all three existing avatar surfaces updated in 2,551 ms | `production-evidence/results.json` |
| Timed completion | Worked; 45,000/45,000 ms supported by 20 observations; 100 test credits; exactly two ledger entries; original countdown restored | `production-evidence/complete-receipt.json` |
| Participant stop | Worked; 5,531/120,000 ms covered; zero credits; restoration in 3,858 ms without reloading existing pages | `production-evidence/early-stop-receipt.json` |
| Direct removal in AIHangout settings | Worked; restored in 2,614 ms; verification detected delivery failure and held settlement with no ledger award | `production-evidence/revocation-results.json` |
| Independent review | Worked; operator reviewed direct removal and released reservation for zero credits; self-review 403, duplicate decision 409, two ledger entries | `production-evidence/direct-removal-receipt.json` |
| Time zone/clock | Worked; Tokyo override and +24h device clock did not end the placement; iPhone-sized WebKit rendered the live production images | `production-evidence/results.json` |
| Cleanup | Worked; original key unchanged, temporary permission revoked, campaigns paused, total participant credits 100 | `production-evidence/results.json` |

This is test-credit operation with no cash value. Verification measures sampled destination availability, not human attention or impressions. Mobile testing used WebKit emulation, not a physical iPhone.

## Deployment and runtime

AIHangout production Worker version: `4b4539bf-85bf-48dd-a80c-5a4f36a80097`.
Frontend: `index-BpOmZaTN.js`. Production verification: 15/15.
Source release checkout: sibling `aihangout-profilepays-release`, branch `codex/profilepays-production-pilot`, based on `7cd65fe`. Only ProfilePays changes were applied; unrelated unpublished signup/chat/bug-image features were excluded. Exactly the two ProfilePays migrations were applied and recorded.

ProfilePays dashboard/API/ledger remain on this computer; they are not a publicly hosted ProfilePays deployment. The isolated live-destination runtime uses frontend 8940, API 8933, and database `profilepays_live_pilot`. The separate ordinary local demo remains on 8930–8932. They do not share placement rows or coordinator engines.

1. Build using `node scripts/static-build.mjs` as documented in STATIC-PILOT.md.
2. With the ordinary local pilot database initialized, start `node scripts/production-pilot-runtime.mjs` and leave it running.
3. Explicit live-test authorization and the existing designated test password in process-only `LIVE_PROFILE_TEST_PASSWORD` are required.
4. Run `node tests/production-static-pilot.mjs`, then `node tests/production-revocation-pilot.mjs` sequentially.
5. Inspect sanitized JSON and screenshots in `.local/production-static`; never publish runtime/account files.

Initial harness attempts are retained locally: a 256px bundled image was correctly rejected by the 128px creative API, then the approved 128px fixture passed. The first operator test navigated before login completed; waiting for the authenticated Review queue link made the complete direct-removal/review retest pass. An intermediate local recovery helper also failed from a missing receipt function after submitting its review; the subsequent complete retest passed, and the ledger audit checks there are no remaining held placements. These harness failures did not change the underlying profile.

Jira: [PP-6 production pilot](https://rob47595-1791122756383.atlassian.net/browse/PP-6).
