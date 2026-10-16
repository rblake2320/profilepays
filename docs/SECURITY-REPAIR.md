# Security regression repair

Addresses the uploaded Adversarial Regression & Security QA Report.

- Logout revokes a server session, its refresh-token family and existing access tokens. Refresh-token reuse, expiry, credential changes and account security deactivation deny session access.
- Refresh credentials are hashed in PostgreSQL and delivered only in a Secure, HttpOnly, SameSite=Strict cookie scoped to `/api/auth`. Access tokens live in memory. Legacy sessions are retired during migration, so existing users must sign in once again.
- Browser identity starts empty and is restored from the authenticated server profile. Edited cached roles are discarded. Cookie actions require the application header and an exact allowed Origin when supplied.
- Participant connect, favorite, hold, join and hold-release APIs enforce participant roles before resource lookup. Advertisers retain control of their sponsored placements.
- Legacy advertisers with no company name receive an owner-editable completion form and cannot publish until completed. No company names are invented or bulk backfilled.
- Participation suspension preserves sign-in, records and appeals; security deactivation remains a separate authentication denial. Production administrator assignment remains deferred and real payouts stay disabled.

## Validation before deployment

Worked: 10 real-PostgreSQL session scenarios, 6 client session scenarios, 14 marketplace/admin scenarios, 7 HTTP scenarios, 32 signup checks, 13 expiry scenarios, workspace role/report checks and support regressions.

The browser reload test exposed old body-token DTO validation on refresh. It was repaired and HTTP empty-body cookie refresh and browser reload passed on retest. A suspended fixture participant signed in and submitted a pending appeal. A legacy advertiser saved their business name, retained it after reload and signed out successfully.

Live release evidence is appended after deployment. No historical held-credit decision is authorized or altered by this repair.

## Live release results — 2026-10-15 CDT

**Worked:** release `0cfb5bb` deployed on existing infrastructure at https://profilepays.ultrarag.app. Database migration completed and health reports the expected release. CI passed: https://github.com/rblake2320/profilepays/actions/runs/38843954496.

- Eight public HTTPS scenarios passed: cookie flags/JSON separation, empty-body rotation and replay denial, logout revocation of refresh and access, CSRF rejection, five advertiser mutation denials plus administrator denial, company completion/null rejection, suspended sign-in/appeal, and suspended offer-hold denial (403).
- Eleven session scenarios passed against compiled modules inside the deployed container using a disposable PostgreSQL schema, including real Nest HTTP routing and the production validation pipe. Fourteen marketplace/admin scenarios also passed against the deployed modules; join connection readback alone uses a stub in that suite.
- Live browser: missing-company prompt shown; business name saved and retained across cookie-based reload; sign-out returned to the public landing page. Suspended fixture participant signed in, submitted a new appeal and reloaded its pending timestamp. At a measured 375-pixel content viewport, scroll width was also 375 pixels.
- Two pre-existing advertisers remain without company names and receive the completion prompt. Their records were not overwritten. Only the newly created test advertiser was temporarily nulled for acceptance.
- Existing member and advertiser both receive 403 from the administrator API. Production administrator count remains zero. Historical placement `c27168df-eb05-4260-9475-a8585cefd730` remains `review_hold`, award 0, zero ledger entries, original image restored.
- Fixture campaign is paused with no placements or reserved credits. Test suspension/appeal records are retained as clearly named security fixtures; no real participant was suspended. No AIHangout profile was changed by these security tests.

Evidence: [public HTTP](security-evidence/live-http.json), [compiled session checks](security-evidence/deployed-sessions.txt), [compiled marketplace checks](security-evidence/deployed-services.txt), [legacy company prompt](security-evidence/live-company-prompt.png), [live mobile appeal](security-evidence/live-suspended-appeal-mobile.png), and [historical-credit preservation](admin-evidence/public-access.json).

Users must sign in once again after deployment because insecure legacy credentials were retired. Future reloads restore the session through the HttpOnly cookie. The owner’s administrator connection and real payouts remain deliberately unconnected/disabled; see [open items](OPEN-ITEMS.md).

Local preview recovery also passed a fresh browser sign-in and reload at http://127.0.0.1:8930/marketplace. Jira PP-7 received the verified release result; GitHub issue #9 tracks this completed repair while #8 retains deferred connections. The refresh HTTP regression is now part of the session CI suite.
