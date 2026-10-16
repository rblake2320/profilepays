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
