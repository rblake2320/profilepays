import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Chip,
  Grid,
  CircularProgress,
} from '@mui/material';
import { AppDispatch, RootState } from '../../store';
import { fetchCampaignById, joinCampaign } from '../../store/slices/campaignsSlice';

const CampaignDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentCampaign, isLoading } = useSelector((state: RootState) => state.campaigns);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchCampaignById(id));
    }
  }, [id, dispatch]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (id) {
      await dispatch(joinCampaign(id));
      alert('Successfully joined campaign!');
    }
  };

  if (isLoading || !currentCampaign) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Button onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Back
      </Button>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardMedia
              component="img"
              height="400"
              image={currentCampaign.sponsoredImageUrl || 'https://via.placeholder.com/600x400'}
              alt={currentCampaign.title}
            />
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            {currentCampaign.title}
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Chip label={currentCampaign.status} color="primary" sx={{ mr: 1 }} />
            <Chip
              label={`$${currentCampaign.payoutPerUser} per user`}
              color="success"
            />
          </Box>

          <Typography variant="body1" paragraph>
            {currentCampaign.description}
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Campaign Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Budget
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    ${currentCampaign.budget}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payout per User
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    ${currentCampaign.payoutPerUser}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(currentCampaign.startDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    End Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(currentCampaign.endDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleJoin}
          >
            Join This Campaign
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CampaignDetailPage;
