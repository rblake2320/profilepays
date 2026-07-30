import { useEffect, useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  Divider, Stack, Typography,
} from '@mui/material';
import { campaignsApi, Campaign } from '../api/campaigns';
import { useAppSelector } from '../hooks/redux';

const ConfirmationPage = () => {
  const location = useLocation();
  const { user } = useAppSelector((s) => s.auth);
  const campaignId = (location.state as any)?.campaignId;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(!!campaignId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      return;
    }
    const fetchCampaign = async () => {
      try {
        const data = await campaignsApi.getById(campaignId);
        setCampaign(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [campaignId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress color="success" />
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" py={4}>
      <Card sx={{ maxWidth: 560, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 72, height: 72, borderRadius: '50%',
                bgcolor: 'success.light', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Typography variant="h3">✓</Typography>
            </Box>

            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={700}>
                You&apos;re in!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                You&apos;ve successfully joined the campaign. Your profile is now promoting this ad.
              </Typography>
            </Stack>

            {error && <Alert severity="warning" sx={{ width: '100%' }}>{error}</Alert>}

            {campaign && (
              <>
                <Divider sx={{ width: '100%' }} />
                <Stack spacing={2} width="100%" textAlign="left">
                  <Typography variant="subtitle1" fontWeight={600}>Campaign Details</Typography>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Campaign</Typography>
                    <Typography variant="body2" fontWeight={600}>{campaign.title}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Your payout</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">
                      ${Number(campaign.payoutPerSwap).toFixed(2)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                    <Typography variant="body2" fontWeight={600}>{campaign.durationHours} hours</Typography>
                  </Stack>
                  {campaign.advertiser?.companyName && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Advertiser</Typography>
                      <Typography variant="body2" fontWeight={600}>{campaign.advertiser.companyName}</Typography>
                    </Stack>
                  )}
                </Stack>
              </>
            )}

            <Divider sx={{ width: '100%' }} />

            <Stack spacing={1} width="100%">
              <Typography variant="body2" color="text.secondary">
                Current wallet balance
              </Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">
                ${Number(user?.walletBalance || 0).toFixed(2)}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
              <Button
                component={RouterLink}
                to="/marketplace"
                variant="outlined"
                fullWidth
              >
                Browse More Campaigns
              </Button>
              <Button
                component={RouterLink}
                to="/"
                variant="contained"
                color="success"
                fullWidth
              >
                Go to Dashboard
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ConfirmationPage;
