import { Stack, Typography, Alert } from '@mui/material';
export default function HowItWorksPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h3">A temporary placement you control.</Typography>
      <Alert severity="info">This pilot uses test credits with no cash value.</Alert>
      <Typography>
        1. A sponsor creates a campaign with an approved static image, duration, test-credit reward,
        and budget.
      </Typography>
      <Typography>
        2. Connect your AIHangout profile using a private code from its settings, review the image
        and terms, then opt in.
      </Typography>
      <Typography>
        3. Timing begins after AIHangout confirms the placement. Periodic checks measure
        availability, not views.
      </Typography>
      <Typography>
        4. At expiry the temporary image disappears, your saved profile returns, and verified test
        credits are recorded. You can stop early or revoke permission in AIHangout. Evidence gaps
        require review.
      </Typography>
    </Stack>
  );
}
