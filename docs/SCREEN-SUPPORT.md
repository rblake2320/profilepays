# Private screen assistance pilot

Open `/support` while signed in, create a connection, open its phone link in Safari,
and open the viewer link on the helper computer. The phone owner must tap **Share
screen** and approve the browser's capture prompt. The viewer cannot operate the
phone. This is an image relay, approximately one frame per second, without audio.

Screen capture is capability-detected, not inferred from an iOS version string.
Unsupported browsers show a specific message and disable capture. Switching apps
can suspend capture or delivery; a stale picture is hidden after six seconds.
The physical iPhone test must check capture, switching tabs/apps, stopping, and
time-zone changes. Desktop or synthetic-image results must not be reported as
physical-device success.

## Access and retention

- Account authentication is required to create a session. Creating another
  session revokes the same account's previous links.
- Independent random 256-bit publish and view capabilities are SHA-256 hashed
  in memory and checked with timing-safe comparison. A publishing link cannot
  read frames; a viewing link cannot publish frames. Either can end the session.
- Link capabilities use URL fragments, not query strings. Requests use bearer
  headers, no cookies. Responses use `Cache-Control: no-store`.
- Only the newest JPEG is retained, at most 85,000 base64 characters. It becomes
  unreadable after six seconds without updates and is cleared by the periodic
  memory cleanup within eight seconds. No frame history, disk storage, or audio.
- Sessions expire after fifteen minutes, and restart loses all sessions. There
  is at most one session per account and twenty sessions per process. This pilot
  requires a single app process; multiple replicas need a deliberate redesign.
- The phone stops its media tracks on Stop, upload failure, page unmount, browser
  track end, and session expiry. Browser/OS capture indicators remain visible.
- Do not publish connection keys or real phone frames in Git, Jira, or test logs.

## Acceptance controls

Broken behavior would include a wrong-role capability reading/writing, an old
frame remaining visible, or stopped/expired grants continuing to work. Positive
controls send an image with the publish key and read the identical image using
the view key. Negative controls use missing, swapped, expired and revoked keys.

`node tests/support-session.cjs` checks the service with a controlled clock for
expiry, plus rejection, rate limiting, replacement and restart semantics.
`node tests/support-live.mjs` checks the deployed HTTPS routes with a synthetic
JPEG and saves redacted evidence under `.local/screen-support/`.

Actual phone capture and iOS background behavior require the owner to approve
Safari's picker on their phone. No endpoint permits arbitrary remote taps,
password entry, or iPhone Settings changes.

## Deployment evidence — 2026-10-15

Release `1a07765` is deployed on the existing Spark-1 host. The deployed HTTPS
checks passed anonymous/wrong-role/forged-key rejection, malformed and oversized
frame rejection, byte-exact JPEG delivery, six-second staleness and Stop revoking
both read and write access. The viewer decoded the synthetic image at 390 × 600.
The phone page measured 375px content width in a 375px content viewport (390px
outer viewport), with no horizontal overflow. These are desktop browser checks.

Live testing found a same-tab reconnect defect: `useState` retained the first
fragment's key when the URL changed. Reloading succeeded, confirming that cached
component state was the cause. `useLocation` plus memoized fragment parsing now
replaces the grant and clears capture/view state. The deployed viewer switched
from a revoked session to a live session without reloading and decoded its image.
`tests/support-navigation.cjs` exercises that transition as a React component
regression. The first implementation's API tests missed router navigation; this
component test now runs in CI alongside the 26 service checks.

Physical iPhone capture, Safari approval, app switching and time-zone behavior
await the owner's explicit Share-screen action. Remote native control is not
implemented. PP-7 remains In Progress for that phone walkthrough.
