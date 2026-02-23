import { Grid, Stack, Typography } from '@mui/material';
import StepCard from '../components/common/StepCard';

const steps = [
  {
    step: 1,
    title: 'Join the marketplace',
    description:
      'Create your ProfilePays account, sync your social profiles, and set your payout preferences. We verify every user to keep advertisers confident.',
  },
  {
    step: 2,
    title: 'Pick creatives you love',
    description:
      'Browse advertiser campaigns by industry, payout, and tone. Save your favorites and lock one in to start the countdown.',
  },
  {
    step: 3,
    title: 'Swap your profile photo',
    description:
      'Follow the guided workflow to upload the creative to your social profile. We capture proof automatically and notify the advertiser.',
  },
  {
    step: 4,
    title: 'Earn and track rewards',
    description:
      'Watch the timer, keep the creative live for the agreed window, and collect your payout. Bonus tiers unlock when you re-up for longer flights.',
  },
];

const HowItWorksPage = () => {
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="overline" color="success.main" fontWeight={700}>
          Page 3b · How It Works
        </Typography>
        <Typography variant="h2">Simple steps to turn your profile into profit.</Typography>
        <Typography variant="body1" color="text.secondary">
          Whether you&apos;re a creator or casual user, ProfilePays guides you from signup to payout
          without the guesswork.
        </Typography>
      </Stack>
      <Grid container spacing={3}>
        {steps.map(step => (
          <Grid item xs={12} md={6} key={step.step}>
            <StepCard step={step.step} title={step.title} description={step.description} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};

export default HowItWorksPage;
