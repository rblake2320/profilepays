import { Stack, Typography, Alert } from '@mui/material';
export default function AboutPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h3">ProfilePays</Typography>
      <Typography>
        ProfilePays lets people intentionally host a sponsored profile image for a defined time,
        with explicit consent, placement checks, and restoration.
      </Typography>
      <Alert severity="info">
        The current implementation is a local AIHangout static-placement pilot. Test credits cannot
        be purchased, withdrawn, or exchanged for money.
      </Alert>
      <Typography>
        Each placement keeps a receipt of its terms, observations, restoration, and test-credit
        ledger. The countdown project supplies related display technology; Glimpse Rush remains a
        separate product.
      </Typography>
    </Stack>
  );
}
