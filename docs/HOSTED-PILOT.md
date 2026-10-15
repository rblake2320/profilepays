# Hosted ProfilePays test-credit pilot

Public dashboard and API: https://profilepays.ultrarag.app

Deployed 2026-10-15 on existing Spark-1 infrastructure. No new paid service was provisioned. The browser, API, scheduler and PostgreSQL ledger now work without the Windows preview process. AIHangout remains the live destination at https://aihangout.ai.

## Running release

- App source: `cfecac2`, built from a Git archive using `docker/Dockerfile.pilot`. See [signup repair](SIGNUP-REPAIR.md) for the subsequent owner-reported signup correction.
- Compose project: `profilepays-pilot`; app port `127.0.0.1:8941`; database has no host-published port.
- Deployment root: `/home/rblake2320/profilepays-pilot`; release checkout: `releases/cfecac2`.
- Private `pilot.env` resides outside release directories, mode 0600. Never commit it or print resolved Compose configuration.
- Dedicated Cloudflare Tunnel `profilepays-pilot`, with systemd unit `profilepays-tunnel.service`, enabled at boot. Existing tunnels were not modified.
- Docker restart policies preserve service operation; persistent PostgreSQL volume preserves campaigns, accounts, placements and receipts.
- Health endpoint: `/api/health` checks the actual database and reports release and test-credit mode.

## Observed acceptance

The live test uses only `live_countdown_test` and its existing question/answer at https://aihangout.ai/problem/290. No public posts are created.

Initial hosted acceptance passed eight checks: opt-in, custom image integrity, already-open profile and older-post updates, mobile WebKit rendering, server-controlled timing under Tokyo time zone and a +24-hour device clock, completed settlement, early-stop settlement and restoration, and grant cleanup. Completion verified 45,000/45,000 ms over 20 observations, awarded 100 test credits and restored the original moving countdown. Early stop verified 5,585 ms, awarded zero, and restored the original in 4,268 ms. These observations verify placement continuity, not audience impressions.

App restart and subsequent release replacement preserved the original two receipts and 100-credit balance. Hosted API checks reject unauthenticated access (401), participant campaign creation (403), and public administrator signup (400). Deep links load. Unknown API routes, missing assets and dotfiles return 404. Unrelated origins are not granted browser CORS access.

The second lifecycle run passed all eight checks on `bc52f5c`; final release `4ac2a99` only changes preview asset bundling and the verification script. Lifecycle and final hosting results are retained in `hosted-evidence/`. Repeat lifecycle runs earn another 100 test credits; assertions reconcile the balance to all retained awards.

## Deployment defects found and corrected

1. Built-in preview images initially decoded with width zero in the actual mobile dashboard. Helmet's CSP and COEP blocked cross-origin AIHangout previews. Allowing the image origin in CSP alone did not fix COEP. The final implementation bundles the two approved PNGs and serves them from the dashboard origin, keeping Helmet's default protections. Custom creatives already used data URLs. The acceptance gate checks both served PNGs byte-for-byte; browser readback checks decoded widths and visual rendering.
2. A Windows-created release archive exported the Linux launcher with CRLF and Bash rejected `pipefail`. `.gitattributes` now enforces LF for shell scripts. The newly extracted release launcher ran successfully. No secret or database state was changed by the failed launch.
3. A predeployment 404 asset probe was cached by Cloudflare with a four-hour max-age. Origin returned 200 while the old public URL returned cached 404; a distinct query confirmed the shipped bytes. Final previews are imported through Vite and use content-hashed same-origin URLs. The verification script resolves the actual entry bundle and checks those exact image URLs, avoiding reliance on cache expiry or manual purge.

The initial custom-image lifecycle test missed built-in preview delivery because it exercised a data URL. The new static-image HTTP assertions and real mobile dashboard check cover that distinct path. Production dependencies reported npm advisories during the image build (3 low, 7 moderate, 9 high); no broad security or capacity certification is claimed by this bounded test-credit deployment.

## iPhone walkthrough

1. In Safari open the public dashboard. Choose **Find your first offer**, then **Participant (test credits)** and create an account.
2. In AIHangout settings, create a ProfilePays connection code for the profile you intend to use. In ProfilePays **Connections**, paste that code and connect. The automated test identity is linked to its separate test participant; do not attempt to move another participant's destination by bypassing ownership checks.
3. Preview **iPhone live test — complete** (60 seconds), select the connected profile, read and accept the test-placement consent, then reserve it.
4. Open the AIHangout profile in another Safari tab. Watch the image change. Return after expiry: expect **restored** and 100 test credits. View the receipt.
5. Preview **iPhone live test — stop early** (120 seconds). Once active, choose **Stop and restore**, confirm, and verify the original image plus zero award.
6. For the time-zone check, change iPhone Settings → General → Date & Time → Time Zone, if iOS permits it. The displayed local end time can change; the campaign's real remaining duration must stay tied to the same server deadline. Return to automatic time afterward. If the phone blocks the setting, report that rather than treating it as a test result.

Physical iPhone testing requires the owner's interaction. Desktop mobile-size rendering and WebKit emulation are recorded separately. Jira PP-7 remains in progress for the physical-device walkthrough.

## Operations

From an extracted release at `releases/<commit>`, build `docker build -f docker/Dockerfile.pilot -t profilepays-pilot:<commit> .`, then run `RELEASE_ID=<commit> PUBLIC_ORIGIN=https://profilepays.ultrarag.app bash scripts/start-hosted-pilot.sh`. The script reuses the root private environment and existing Compose project.

To roll back the image, run the launcher from a retained earlier release with its release ID. Do not run `down -v`: it removes the database. The preview-image-only releases made no database schema change. Stop only `profilepays-tunnel` to withdraw this public hostname; never alter another product's tunnel.

Host backup/recovery remains the existing infrastructure operator's responsibility. Container restart persistence was tested; a host-wide disaster recovery exercise was not part of this deployment request.
