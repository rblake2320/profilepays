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
