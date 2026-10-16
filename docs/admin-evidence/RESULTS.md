# Administrator acceptance — October 15, 2026

## Worked: source and isolated PostgreSQL

- Backend build, frontend production build and frontend TypeScript check passed.
- `tests/fair-marketplace.cjs`: 13 real PostgreSQL scenarios, including admin-only overview, literal search, self-review denial, award bounds, breach payout refusal, single settlement, balanced ledger, participant review notice, upheld appeals and protection against stale appeals. Schema is disposable and asserted before mutations; connector join readback is stubbed. [Output](postgres-source.txt).
- Existing expiry suite: 13 timing/removal cases. Signup suite: 32 checks. Role/report SSR checks include admin route isolation.

## Worked: built application in real browser

Used a fresh isolated PostgreSQL database and the compiled Nest/React application on loopback port 8936. Fixture accounts and placement were created for this test only; no real social placement or production administrator account was created.

1. Admin signed in and landed on `/reviews`.
2. Opened held fixture receipt (30-second terms, 29-second fixture coverage), entered review reason, confirmed a 100 test-credit decision. Queue changed from 1 to 0.
3. Selected `@local_admin_test`, entered reason, confirmed suspension. UI reported suspended and retained timestamp.
4. Participant signed in separately, saw review notification with 100 test credits and exact UTC time, and submitted a suspension appeal. UI showed pending.
5. Admin inspected the appeal and original suspension, entered decision reason and confirmed overturn. Pending queue changed to 0; decision history retained suspension, restoration and appeal outcome.
6. Participant refresh showed overturned with reason and no active suspension.
7. Responsive admin view at 390px configured width measured 375px content width and 375px scroll width: no horizontal page overflow.

Screenshots: [decision history](local-admin-history.png), [mobile participant controls](local-admin-mobile.png).

Direct database readback confirmed the browser actions persisted: two balanced ledger entries, award 100, access restored and appeal overturned. [Fixture state](local-browser-state.json).

## Worked: deployed artifact and public access boundaries

- Release `1ca7f52` deployed to existing infrastructure; HTTPS health reports connected database and test-credit mode.
- All 13 PostgreSQL scenarios passed again against the deployed compiled modules in a disposable schema. [Output](postgres-deployed.txt).
- Anonymous admin API returned 401; participant and advertiser returned 403. Historical credit remained `review_hold`, award 0, no ledger entries, restored original. [Public checks](public-access.json).
- A signed-in production participant opening `/reviews` was redirected to the marketplace, with no admin navigation exposed.
- [GitHub CI run 38842090514](https://github.com/rblake2320/profilepays/actions/runs/38842090514) passed all checks and both builds.
- [Open-item tracker #8](https://github.com/rblake2320/profilepays/issues/8) records deferred connections and inactive placeholders.

## Deferred by owner

Production administrator provisioning, review of the historical held credit, and owner's production ban/appeal walkthrough remain open by explicit instruction. See [OPEN-ITEMS.md](../OPEN-ITEMS.md). No production account promotion or credit decision was made in this work.
