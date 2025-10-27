import { Box, Button, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material';
import { PlayCircleIcon } from '../components/common/icons';
import { Link as RouterLink } from 'react-router-dom';

const ConfirmationPage = () => {
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="overline" color="success.main" fontWeight={700}>
          Page 3 · Confirmation
        </Typography>
        <Typography variant="h2">You&apos;re ready to go live.</Typography>
        <Typography variant="body1" color="text.secondary">
          Preview your selected creative, confirm advertiser requirements, and activate your payout
          tracker.
        </Typography>
      </Stack>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 3,
                    overflow: 'hidden',
                    background:
                      'linear-gradient(120deg, rgba(255,255,255,0.4), rgba(46,125,50,0.2))',
                    border: '1px solid',
                    borderColor: 'divider',
                    minHeight: { xs: 220, md: 320 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlayCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
                </Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Watch how payouts work
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Once you go live we automatically capture proof-of-profile, notify the advertiser,
                  and release funds to your wallet. Keep the creative up for the full duration to
                  secure the bonus tier.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button variant="contained" color="success" size="large">
                    Start Campaign
                  </Button>
                  <Button component={RouterLink} to="/marketplace" variant="outlined" size="large">
                    Pick a different ad
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Advertiser details
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Brand
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    Target
                  </Typography>
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Payout timing
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    04:26 remaining
                  </Typography>
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Swap duration
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    24 hours
                  </Typography>
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Bonus
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    +$8 for 48 hours
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default ConfirmationPage;
