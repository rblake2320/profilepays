import { Box, Button, Card, CardContent, CardHeader, Grid, Stack, Typography } from '@mui/material';
import CountdownTimer from '../components/home/CountdownTimer';
import StatCard from '../components/common/StatCard';
import InfoPanel from '../components/common/InfoPanel';
import { Link as RouterLink } from 'react-router-dom';

const HomePage = () => {
  return (
    <Stack spacing={6}>
      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant="overline" color="success.main" fontWeight={700}>
                  Page 1 · Home
                </Typography>
                <Typography variant="h1" component="h1">
                  Turn your profile into profit.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  ProfilePays connects advertisers with real users who are ready to feature brand
                  creatives as their profile photos. Earn payouts for every swap and grow your
                  influence.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    component={RouterLink}
                    to="/advertisers"
                    variant="contained"
                    color="success"
                    size="large"
                  >
                    Advertisers Sign Up
                  </Button>
                  <Button component={RouterLink} to="/marketplace" variant="outlined" size="large">
                    Everyone Else Sign Up
                  </Button>
                </Stack>
                <InfoPanel
                  title="Why users love ProfilePays"
                  items={[
                    'Instant payouts after each campaign',
                    'Verified brand partners you know',
                    'Creative tools to keep your profile fresh',
                  ]}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Stack spacing={3} height="100%">
            <CountdownTimer />
            <Card>
              <CardHeader title="Welcome to ProfilePays!" subheader="Live marketplace stats" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <StatCard
                      title="Active Advertisers"
                      value="127"
                      helperText="Launching campaigns this week"
                      variant="campaigns"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <StatCard
                      title="Total Paid to Users"
                      value="$482,300"
                      helperText="Across 12,400 swaps"
                      variant="wallet"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <StatCard
                      title="Avg. Payout Per Swap"
                      value="$12.40"
                      helperText="Based on your tier"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
      <Box>
        <Typography variant="h3" gutterBottom>
          Trusted by modern brands
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We are onboarding launch partners across retail, consumer tech, automotive, and finance
          verticals to ensure a balanced marketplace for every community.
        </Typography>
      </Box>
    </Stack>
  );
};

export default HomePage;
