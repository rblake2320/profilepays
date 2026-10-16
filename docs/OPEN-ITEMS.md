# Open integrations and placeholders

Owner instruction, October 15, 2026: add the administrator side without connecting an administrator account yet; record anything left open or represented by placeholders in GitHub.

This is a test-credit pilot. A working screen or provider interface is not a connected financial or identity service. The list below distinguishes active implementation from deferred connections and unused scaffold code.

| Item | Current status / source | What remains / acceptance |
|---|---|---|
| Production administrator account | **DEFERRED BY OWNER.** `/reviews` and `/api/placements/admin` require a server-verified admin role. No public admin signup or default admin password. | Owner selects a separate account; operator provisions it through a controlled process. Verify sign-in, non-admin denial and independent review. No production role was granted for this change. |
| Historical held test credit | **OPEN.** Placement `c27168df-eb05-4260-9475-a8585cefd730` remains `review_hold`, award 0; profile restored. | Connected independent admin inspects the five-minute receipt and records a reasoned decision. No automated backfill or award. |
| Owner's live suspension / appeal walkthrough | **DEFERRED with admin connection.** Full workflow tested with isolated local accounts. | Follow [ADMINISTRATOR.md](ADMINISTRATOR.md) on the designated test participant after admin provisioning. Verify denied new offers, appeal visibility, decision reason/time and restored eligibility. |
| Legal/payee identity | **UNCONNECTED.** `backend/src/placements/identity-provider.ts` intentionally returns unavailable. `verified_payees` is a future provider seam, not proof of identity. | Select provider; hosted verification, signed callbacks, replay protection, unique payee linking and tested rejection paths. Do not collect tax IDs or identity documents in current forms. Social connection proves control only. |
| Real money, funding, payout and taxes | **DISABLED.** Active placement ledger is `TEST_CREDIT` only. | Connect provider, funded accounting, settlement/reversal reconciliation and tax reporting before any real-money launch. No test credits convert automatically to cash. |
| Paid analytics packages | **FREE PREVIEW.** Demand/delivery/all export choices and access records work; `realChargesEnabled=false` in `fair-marketplace.ts`. | Pricing, entitlements, paid checkout and failed/refunded purchase tests. Current data measures offer/hold/placement activity, not independently measured audience reach. |
| Audience clicks / impressions | **OPEN instrumentation.** Placement verification checks the assigned surface, not unique viewers or ad clicks. | Define metrics, consent/retention and destination instrumentation; verify deduplication and bot handling before selling these metrics. |
| Notifications | **IN-APP implemented.** Participant breach/review notices and sponsor completed/broken preferences; printable agreement reports. | Email, SMS, push delivery and delivery receipts are unconnected. Preference changes currently control in-app notices, not an external messaging provider. |
| Email verification delivery | **TODO in active auth service.** `backend/src/auth/auth.service.ts` creates tokens but does not send verification mail. Resend log wording is not delivery evidence. | Provider, templates, delivery handling and verified email round-trip. Pilot sign-in does not imply verified email or legal identity. |
| Other social / website integrations | **AIHangout connector only.** External-platform compatibility research is not a shipped connector. | WordPress plugin, embeds and any restricted platform connector require implementation and actual installation tests. |
| Cross-app iPhone assistance | **External screen-sharing app required for cross-app viewing.** Browser support relay is limited to browser-supported capture. | Native companion/integration remains optional future work. The current browser relay does not provide remote iPhone control. |

## Inactive scaffold and sample code

These files remain in the repository but are not connected to the active pilot routes. Do not enable them as finished features.

| Source | Placeholder / unfinished behavior | Required before use |
|---|---|---|
| `backend/src/payments/payments.service.ts` | Legacy dummy provider key and payout TODO; PaymentsModule is not imported by AppModule. | Replace with audited provider-backed accounting; never expose placeholder wallet mutation as payout success. |
| `backend/src/campaigns/campaigns.controller.ts` | Legacy manual-start path returns not implemented; CampaignsModule is not loaded. | Current lifecycle lives in PlacementsModule. Remove or migrate legacy code rather than reconnecting competing lifecycle paths. |
| `frontend/src/data/mockAds.ts`, `components/common/AdCard.tsx` | Unused sample catalog / visual placeholder component; no importing active application route. | Remove during cleanup or replace with actual campaign data if reused. |
| `frontend/src/api/__mocks__/client.ts` | Test-only API mock. | Keep confined to tests; never count it as live integration evidence. |
| `scripts/init-db.sql` | Old placeholder bootstrap. | Hosted pilot uses TypeORM migrations. Reconcile/remove obsolete bootstrap before documenting it as an alternative deployment path. |
| README planned stack / broad workflow spec | Roadmap mentions OAuth, subscriptions and payout providers. | Treat as plans. Active login is email/password; no claim that every planned provider is integrated. |

## Completion rule

Close an item only with the receiving-side result: verified role and independent decision, actual delivered notification, provider receipt, or installed connector behavior. Keep secrets and personal identity material out of issues, screenshots and committed evidence. See [administrator acceptance](admin-evidence/RESULTS.md) for this change's actual checks.
