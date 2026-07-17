import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, CardMedia, Chip,
  CircularProgress, Grid, Stack, Typography,
} from '@mui/material';
import { campaignsApi, Campaign } from '../api/campaigns';

const AdSelectionPage = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [participating, setParticipating] = useState(false);

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        setLoading(true);
        const data = await campaignsApi.getMarketplace();
        setCampaigns(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetchMarketplace();
  }, []);

  const handleParticipate = async () => {
    if (!selectedId) {
      return;
    }
    try {
      setParticipating(true);
      await campaignsApi.participate(selectedId, 'instagram');
      navigate('/confirmation', { state: { campaignId: selectedId } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join campaign');
    } finally {
      setParticipating(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="overline" color="success.main" fontWeight={700}>
          Marketplace
        </Typography>
        <Typography variant="h4" fontWeight={700}>
          Choose a campaign to promote
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select an ad campaign to display on your profile and start earning payouts.
        </Typography>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress color="success" />
        </Box>
      ) : campaigns.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography color="text.secondary">
            No active campaigns available right now. Check back soon!
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {campaigns.map((campaign) => (
              <Grid item xs={12} sm={6} md={4} key={campaign.id}>
                <Card
                  variant={selectedId === campaign.id ? 'elevation' : 'outlined'}
                  elevation={selectedId === campaign.id ? 4 : 0}
                  sx={{
                    cursor: 'pointer',
                    border: selectedId === campaign.id ? '2px solid' : undefined,
                    borderColor: selectedId === campaign.id ? 'success.main' : undefined,
                    transition: 'all 0.2s',
                    '&:hover': { boxShadow: 4 },
                  }}
                  onClick={() => setSelectedId(campaign.id)}
                >
                  {campaign.imageUrl && (
                    <CardMedia component="img" height="160" image={campaign.imageUrl} alt={campaign.title} />
                  )}
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="subtitle1" fontWeight={600}>{campaign.title}</Typography>
                        <Chip label={`$${Number(campaign.payoutPerSwap).toFixed(2)}`} color="success" size="small" />
                      </Stack>
                      {campaign.description && (
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {campaign.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={2}>
                        <Typography variant="caption" color="text.secondary">
                          {campaign.durationHours}h duration
                        </Typography>
                        {campaign.industry && (
                          <Typography variant="caption" color="text.secondary">
                            {campaign.industry}
                          </Typography>
                        )}
                        {campaign.advertiser?.companyName && (
                          <Typography variant="caption" color="text.secondary">
                            by {campaign.advertiser.companyName}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
            <Button
              variant="contained"
              color="success"
              size="large"
              disabled={!selectedId || participating}
              onClick={handleParticipate}
              startIcon={participating ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {participating ? 'Joining…' : 'Confirm Selection'}
            </Button>
          </Stack>
        </>
      )}
    </Stack>
  );
};

export default AdSelectionPage;
