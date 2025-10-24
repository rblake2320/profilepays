import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import { AppDispatch, RootState } from '../../store';
import { fetchCampaigns } from '../../store/slices/campaignsSlice';

const CampaignsPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { campaigns, isLoading } = useSelector((state: RootState) => state.campaigns);

  useEffect(() => {
    dispatch(fetchCampaigns({ page: 1, limit: 20 }));
  }, [dispatch]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Active Campaigns
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Browse and join campaigns to start earning
      </Typography>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" textAlign="center" py={4}>
              No active campaigns available at the moment.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {campaigns.map((campaign) => (
            <Grid item xs={12} sm={6} md={4} key={campaign.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={campaign.sponsoredImageUrl || 'https://via.placeholder.com/400x200'}
                  alt={campaign.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {campaign.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {campaign.description.substring(0, 100)}...
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={`$${campaign.payoutPerUser} per user`}
                      color="success"
                      size="small"
                    />
                    <Chip label={campaign.status} size="small" />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    component={RouterLink}
                    to={`/campaigns/${campaign.id}`}
                  >
                    View Details
                  </Button>
                  <Button size="small" variant="contained">
                    Join Campaign
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default CampaignsPage;
