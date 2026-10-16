# Administrator console and walkthrough

Open `/reviews` after signing in with a separately provisioned administrator account. Connection of the owner's account is deliberately deferred; production members and advertisers cannot enter this console. Test credits have no cash value.

## Review held test credits

1. Select **Held credits**, then **Inspect evidence** for the intended agreement.
2. Read contracted/verified time, restoration, breach evidence and timestamped observations/events.
3. Enter an award from zero through the contracted reward and a reason. A confirmed breach permits zero only. An admin cannot review an agreement they sponsored or participated in.
4. Select **Review credit decision**, check the confirmation, then **Confirm decision**.
5. The agreement leaves the queue; its receipt records reviewer, reason, server time and balanced ledger entries. Participant receives an in-app review notice. Repeating settlement is rejected.

The historical five-minute test `c27168df-eb05-4260-9475-a8585cefd730` is intentionally left for the owner to review later. Do not treat the isolated fixture award as a decision on that agreement.

## Suspend a test participant and handle their appeal

1. Under **Participants**, search for the designated test profile and select it. Check its name, account ID, confirmed breaches and current access status.
2. Enter a test-specific reason, choose **Review suspension**, then confirm. This blocks new offers across ProfilePays; existing agreements retain their terms. Advertiser exclusions remain a separate advertiser-only restriction.
3. Sign in as that participant in a separate browser session. Under **Placements → Your standing and appeals**, read the suspension reason/time, enter an appeal statement, then select **Appeal suspension**. Signing in and viewing receipts remain available.
4. As administrator, open **Appeals**. Read the statement and original decision, enter the review reason and choose **Uphold decision** or **Overturn decision**; confirm the exact action.
5. Uphold keeps the restriction. Overturn restores offer access only if the appeal still refers to the current suspension. A newer suspension cannot be silently erased by an older appeal.
6. Refresh the participant view to see the outcome/reason. Review **Decision history** for reviewer IDs and local/UTC timestamps. Confirm a new offer is eligible subject to its own campaign rules.

Overturning a breach mark adjusts future eligibility; it does not rewrite an already-settled agreement ledger. The UI requires a reason and explicit confirmation for admin mutations.

## Implemented boundaries

- Server checks the current database role, not a user-controlled role field or local UI state.
- Admin overview exposes member names/profile handles and IDs only to administrators.
- Search treats SQL wildcard characters literally and accepts at most 100 characters.
- Up to 100 participants match a search; history shows the latest 100 conduct decisions. Credit decisions remain in agreement receipts.
- All current settlement and notifications are test-credit/in-app only. See [open items](OPEN-ITEMS.md).
