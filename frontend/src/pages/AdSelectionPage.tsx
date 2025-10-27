import { useMemo, useState } from 'react';
import { Box, Grid, Stack, Tab, Tabs, Typography, Button, Card, CardContent } from '@mui/material';
import { CheckCircleFilledIcon } from '../components/common/icons';
import AdCard from '../components/common/AdCard';
import mockAds, { AdCategory } from '../data/mockAds';
import { Link as RouterLink } from 'react-router-dom';

const categories: (AdCategory | 'All')[] = [
  'All',
  'Retail',
  'Tech',
  'Automotive',
  'Entertainment',
  'Finance',
];

const AdSelectionPage = () => {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('All');
  const [selectedAdId, setSelectedAdId] = useState<string | null>('1');

  const visibleAds = useMemo(() => {
    if (activeCategory === 'All') {
      return mockAds;
    }
    return mockAds.filter(ad => ad.category === activeCategory);
  }, [activeCategory]);

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="overline" color="success.main" fontWeight={700}>
          Page 2b · User Ad Select
        </Typography>
        <Typography variant="h2">Choose the ad you want to feature.</Typography>
        <Typography variant="body1" color="text.secondary">
          Explore trending creatives from brands you love. Pick one to swap into your profile and
          unlock instant payouts.
        </Typography>
      </Stack>
      <Tabs
        value={activeCategory}
        onChange={(_, value) => setActiveCategory(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {categories.map(category => (
          <Tab key={category} value={category} label={category} sx={{ fontWeight: 600 }} />
        ))}
      </Tabs>
      <Grid container spacing={3}>
        {visibleAds.map(ad => (
          <Grid item xs={12} sm={6} md={4} key={ad.id}>
            <AdCard
              title={ad.title}
              category={ad.category}
              payout={`$${ad.payout}`}
              selected={selectedAdId === ad.id}
              onSelect={() => setSelectedAdId(ad.id)}
            />
          </Grid>
        ))}
      </Grid>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
        <Card variant="outlined" sx={{ flexGrow: 1 }}>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
            >
              <CheckCircleFilledIcon color="success" />
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  You&apos;ve saved 4 ads so far
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Keep exploring to unlock higher tier payouts and bonuses from recurring
                  advertisers.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={RouterLink}
            to="/confirmation"
            variant="contained"
            color="success"
            size="large"
            disabled={!selectedAdId}
          >
            Confirm Selection
          </Button>
          <Button variant="outlined" size="large">
            Save to Queue
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default AdSelectionPage;
