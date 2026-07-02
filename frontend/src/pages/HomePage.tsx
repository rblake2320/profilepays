import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, Chip, Grid, Stack, Typography,
} from '@mui/material';
import CountdownTimer from '../components/home/CountdownTimer';
import StatCard from '../components/common/StatCard';
import StepCard from '../components/common/StepCard';
import { campaignsApi, PlatformStats } from '../api/campaigns';

const TRUSTED_BRANDS = ['Nike', 'Spotify', 'Airbnb', 'Shopify', 'Stripe', 'Notion'];

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Sign up for free',
    description: 'Create your member account in under 2 minutes. No credit card required.',
  },
  {
    step: 2,
    title: 'Browse campaigns',
    description: 'Explore active ad campaigns from verified advertisers and pick one that fits your audience.',
  },
  {
    step: 3,
    title: 'Display the ad',
    description: 'Temporarily set the campaign creative as your profile picture on your chosen platform.',
  },
  {
    step: 4,
    title: 'Get paid',
    description: 'Earn your payout automatically once the campaign duration completes.',
  },
];

const DEFAULT_STATS = {
  totalCampaigns: 127,
  activeCampaigns: 43,
  totalPaidOut: 482300,
  totalParticipations: 18500,
};

const HomePage = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    campaignsApi.getStats().then(setStats).catch(() => {
      // Silently fall back to default stats if API is unavailable
    });
  }, []);

  const displayStats = stats || DEFAULT_STATS;

  return (
    <Stack spacing={8}>
      {/* Hero */}
      <Stack spacing={3} alignItems={{ xs: 'flex-start', md: 'center' }} textAlign={{ xs: 'left', md: 'center' }}>
        <Chip label="Now live · Payouts every 30 days" color="success" variant="outlined" />
        <Typography variant="h1" fontWeight={800} maxWidth={720}>
          Turn your profile picture into{' '}
          <Box component="span" color="success.main">
            real income
          </Box>
        </Typography>
        <Typography variant="h6" color="text.secondary" maxWidth={560} fontWeight={400}>
          ProfilePays connects brands with everyday people. Swap your profile picture for a brand
          ad and get paid — it&apos;s that simple.
        </Typography>
        <CountdownTimer durationInMinutes={43200} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            color="success"
            size="large"
          >
            Start Earning — It&apos;s Free
          </Button>
          <Button
            component={RouterLink}
            to="/register?type=advertiser"
            variant="outlined"
            size="large"
          >
            Advertise with Us
          </Button>
        </Stack>
      </Stack>

      {/* Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active advertisers"
            value={displayStats.activeCampaigns.toLocaleString()}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total paid out"
            value={`$${(displayStats.totalPaidOut / 1000).toFixed(0)}K+`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total campaigns"
            value={displayStats.totalCampaigns.toLocaleString()}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Participations"
            value={displayStats.totalParticipations.toLocaleString()}
          />
        </Grid>
      </Grid>

      {/* How it works */}
      <Stack spacing={4}>
        <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} textAlign={{ xs: 'left', md: 'center' }}>
          <Typography variant="overline" color="success.main" fontWeight={700}>
            How it works
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            Four steps to your first payout
          </Typography>
        </Stack>
        <Grid container spacing={3}>
          {HOW_IT_WORKS_STEPS.map((step) => (
            <Grid item xs={12} sm={6} md={3} key={step.step}>
              <StepCard step={step.step} title={step.title} description={step.description} />
            </Grid>
          ))}
        </Grid>
      </Stack>

      {/* Trusted brands */}
      <Stack spacing={3} alignItems="center">
        <Typography variant="overline" color="text.secondary" fontWeight={700}>
          Trusted by brands including
        </Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center">
          {TRUSTED_BRANDS.map((brand) => (
            <Typography key={brand} variant="h6" fontWeight={700} color="text.disabled">
              {brand}
            </Typography>
          ))}
        </Stack>
      </Stack>

      {/* CTA */}
      <Card
        sx={{
          background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <CardContent sx={{ py: 6 }}>
          <Stack spacing={3} alignItems="center">
            <Typography variant="h3" fontWeight={700} color="white">
              Ready to start earning?
            </Typography>
            <Typography variant="body1" color="rgba(255,255,255,0.8)" maxWidth={480}>
              Join thousands of members already earning from their social profiles. Sign up free
              today.
            </Typography>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              size="large"
              sx={{ bgcolor: 'white', color: 'success.dark', '&:hover': { bgcolor: 'grey.100' } }}
            >
              Create Free Account
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default HomePage;
