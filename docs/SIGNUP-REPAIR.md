# Signup repair — 2026-10-15

Shipped release: `78950f9` at https://profilepays.ultrarag.app/register.

The owner reported an unexplained Bad Request on iPhone. The exact input rejected on that phone was not captured and no password was requested. The same failure was reproduced in the real registration form with `José O’Neil` and a password satisfying the old policy. Separate live API probes returned the same generic 400 for email whitespace and incomplete password composition.

## Cause and changes

Production `ValidationPipe` suppressed all validation reasons. The browser only required eight password characters, while the server imposed additional composition rules and a restricted symbol set. Name validation rejected accented letters and smart apostrophes, and email validation rejected surrounding whitespace.

The form and DTO now use `backend/src/auth/signup-policy.ts` for the same password and name rules. Password guidance appears before submission: 8–128 characters, uppercase and lowercase Latin letters, a number, and a symbol such as `!`, `#`, or `-`. Passwords are never trimmed. Email/name whitespace is normalized; Unicode names and curly apostrophes are accepted. Signup and login both normalize email whitespace.

The production pipe returns field messages without submitted values or DTO objects. The signup form focuses and annotates rejected fields, retains entries, and displays useful duplicate-account, network and rate-limit feedback. Error arrays become readable text. Public administrator creation and unknown privilege fields remain rejected.

## Verification and escape analysis

- `node tests/signup-validation.cjs`: 25 checks passed, including browser/server policy parity, invalid types, missing fields, invalid names, unknown privilege fields, password-value redaction, duplicate/error-array/network/rate-limit presentation, and confirmation mismatch.
- `node tests/signup-live.mjs`: nine live HTTPS scenarios passed, including six specific 400 responses, successful normalized signup, duplicate 409, and login plus real marketplace access.
- Real browser at 390px: upfront rules visible; weak password focused with `aria-invalid=true`; duplicate email explained while values remain; corrected signup reached the marketplace. Evidence identifies this as browser viewport testing, not the owner's physical iPhone.
- Existing hosted smoke checks passed. A first immediate smoke attempt hit the existing 10/minute auth throttle after the signup burst (429); the check passed after the window expired. Limits were not disabled or increased.
- Backend build from its actual workspace directory and clean Docker builds passed. An initial root-directory Nest invocation selected conflicting local Node types; running the configured backend workspace and the clean container resolved that invocation issue without changing crypto code.

Earlier lifecycle acceptance created synthetic accounts directly through the API with compliant values and then tested login. It skipped the human registration form and did not exercise invalid input with production error settings. The new GitHub `Signup validation contract` job runs the policy/error checks and both builds. The live signup script and retained before/after UI checks cover the deployed boundary.

The sweep included signup DTO, login DTO, auth request mapping, Redux rejection handling, and the actual registration schema. The legacy `RegisterDto` is not the controller's signup contract. Advertiser company metadata is not sent to the signup DTO, so it was not identified as the cause of these generic 400s.

## Owner retest

Refresh https://profilepays.ultrarag.app/register in Safari. Confirm the password rules appear under the password field, then retry. If an error remains, report its exact text; do not share the password. PP-7 remains open for the physical iPhone walkthrough.

Evidence is under `signup-evidence/`. Credentials and auth tokens are excluded.
