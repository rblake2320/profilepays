# Agreement enforcement and fair participation

ProfilePays remains a test-credit pilot. Real money, identity verification and paid analytics billing are disabled. The public dashboard is https://profilepays.ultrarag.app.

## Shipped rules

- A 60-second server-timed hold reserves capacity before commitment. Cancel/expiry adds no breach. Confirmation requires the participant's current, unexpired hold, current advertiser eligibility, consent and destination permission. Retries do not extend the deadline.
- AIHangout records an irreversible removal event at the destination. Removing and replacing the image between observations still breaks the agreement. Participant cancellation after placement starts also creates a mark. Uncertain infrastructure evidence goes to review rather than a misconduct mark.
- Participants receive in-app breach notices with local time, UTC, placement ID and withheld test credits. Advertisers choose broken/completed/both/report-only. Printable agreement reports remain available regardless of preferences.
- Advertisers may exclude participants individually or as named lists from their own future offers. Lists are explicit participant IDs, not inferred sensitive categories. Exclusions do not cancel existing contracts or ban participants from other advertisers. Eligibility is checked again at confirmation.
- Campaigns may require fewer than a chosen number of confirmed breaches. Overturned marks do not count. Platform suspension requires an administrator, records a reason/time, and leaves sign-in and appeals available. Appeals have independent review; a campaign sponsor cannot review its own breach. Overturning a mark does not automatically rewrite or pay an agreement.
- Demand/delivery/all analytics have a free test preview and downloadable JSON. Demand measures holds, cancellations, expiries, confirmations and time to capacity. Delivery measures verified placement time and agreement outcomes. These are not audience impressions or click-through counts. No paid package checkout exists yet.

## Identity provider connection point

`backend/src/placements/identity-provider.ts` defines hosted verification and authenticated callback interfaces. The only installed adapter is UnconfiguredIdentityProvider: it refuses starts and callbacks with 503. The dashboard reports not_verified and realPayoutsEnabled=false. No endpoint accepts a self-declared verified status, tax identifier or identity document. Legacy payment controllers are not loaded by AppModule.

The `verified_payees` table reserves one provider subject per ProfilePays account and a unique (provider,subject_digest) across accounts. It contains no names, tax numbers or documents. No production identity is written until a real adapter is implemented and verified. Current account exclusions/history cannot detect the same person opening multiple ProfilePays accounts; users are explicitly shown that linked social-account control is not legal identity verification.

To connect a provider later: select and configure it privately; implement hosted onboarding, authenticated/idempotent callbacks, provider-subject binding and revocation; test duplicate-person handling and recovery. Enable real payments only in a separately reviewed payout implementation. Adding a key alone cannot enable payouts in this release.

## Retained live evidence

Earlier deecd75 / AI connector 4c88970:
- Completed placement c7f1b417-f7c7-4bdc-9d6f-910e2287c636: 30,000/30,000 ms verified, 100 test credits, two balanced ledger entries, original restored.
- Removal/replacement placement 4e0e690a-9ebe-4945-bf2d-a16a7570191c: replacement in 398 ms, zero observations during removal, permanent destination breach at 2026-10-16T02:14:18.138Z, zero award, original restored. Replay stayed ended and renewal returned 409.
- Physical iPhone screen shared through Teams across Safari/Settings. Owner changed Chicago to Tokyo and back. The server deadline was unchanged and original countdown returned. An expiry race initially withheld the five-minute test award; reproduction and repair are below.

## Expiry defect and repair

Failed: placement c27168df-eb05-4260-9475-a8585cefd730 restored at expiry but entered review_hold with zero award. Local time was 5 ms before the deadline while the origin observation was 103 ms later, already expired. The verifier misclassified normal expiry as missing delivery.

Repair: reconcile the authoritative assignment receipt, validating assignment ID, start/end, origin time, lease, original match, stop and breach state. The regression suite tests both sides of the clock boundary, renew conflicts, changed origin, early disappearance and remove/replace. The live 30-second retest then earned 100 credits and restored. The original five-minute record remains held for an authorized operator; no database credit override was performed.

Escape: prior tests used aligned clocks and did not exercise destination expiry between the local check and remote response. The new expiry regression is in CI. Sweep: public readback, renew and final settlement paths all consult origin expiry/breach evidence.

Notification preference response defect: TypeORM UPDATE RETURNING yields a nested driver tuple; directly destructuring it returned no preferences and hid a missing-row result. A CTE returning a normal SELECT result fixes the response and unauthorized 404. All four preference combinations and invalid/foreign updates are tested against PostgreSQL and public HTTPS.

## Repeatable verification

- `node tests/fair-marketplace.cjs`: ten scenarios using real PostgreSQL in a disposable schema. Only the join's remote connection readback is stubbed; eligibility, locking, reservations, appeals, uniqueness and persistence use the real database.
- `node tests/placement-expiry.cjs`: thirteen deterministic clock/remote-fault scenarios.
- `node tests/signup-validation.cjs`: 32 validation and safe-error scenarios.
- `node tests/workspace-contract.cjs`: role routing and report rendering/escaping.
- `node tests/fair-live.mjs <stage>`: staged designated-profile HTTPS tests; private fixture state stays under ignored .local/fair-live. Never publish private.json or connection codes. Prepare uses existing private test accounts and a process-only AIHangout password; it refuses to overwrite a prepared run.

Current live receipts are saved under docs/agreement-evidence. Production admin success paths require a separate authorized operator account; the live advertiser denial is tested, and admin decision/appeal flows are tested with isolated PostgreSQL fixtures.

Release 42494f0 live acceptance (2026-10-16 UTC):
- HTTPS policy checks: identity start 503; legacy payout 404; advertiser platform ban 403; breached participant eligibility 403; exclusion added during hold rejects confirmation 403; foreign hold release 404; all four notification modes persist.
- Hold expired naturally, rejected confirmation 409 at 69,896 ms after creation; no assignment or breach.
- Browser hold and confirmation created 6a98e205-f14a-4a1d-839f-85b26e06931b: 30,000/30,000 ms, 14 observations, 100 test credits, original restored.
- a52acf0a-3061-41e7-9b38-22d5ea1cfe96 removed and replaced in 303 ms: 0 award, one mark, breach timestamp 2026-10-16T02:26:55.763Z, original restored. Both ledgers balanced with exactly two entries each.
- Browser advertiser list add/remove succeeded. Printable report shows completed, broken and held-for-review records. Analytics matched three holds: one cancelled, one expired, one confirmed; capacity filled in 80.813 seconds, verified 30 seconds, awarded 100 test credits.
- Temporary exclusions removed, three new campaigns paused, connector grant revoked, original profile checked.
- Ten additional scenarios ran against compiled modules inside the actual deployed container, using an isolated PostgreSQL schema that was verified before use and dropped after testing. Admin suspend/appeal/restore and unique provider subject checks passed there. No production account was granted administrator privileges.
- CI for 42494f0 passed: https://github.com/rblake2320/profilepays/actions/runs/38840204413.

Final UI release c9f52a4: latest notice plus expandable history; connection/confirmation pages are free of old alerts; analytics now render labeled metrics. Fresh 390px Chrome check measured client/scroll width 375/375 and textarea height 96px. Final backend behavior is unchanged from 42494f0. The final dashboard and mobile controls are in agreement-evidence/final-dashboard.png and mobile-exclusions.png.
