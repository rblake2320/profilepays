import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, ExitToApp as LogoutIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { campaignService, Campaign } from '../services/campaign.service';

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (user?.userType === 'advertiser') {
      loadMyCampaigns();
    } else {
      loadAllCampaigns();
    }
  }, [user, isAuthenticated, navigate]);

  const loadMyCampaigns = async () => {
    try {
      const data = await campaignService.getMyCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCampaigns = async () => {
    try {
      const data = await campaignService.getAll();
      setCampaigns(data.filter(c => c.status === 'active'));
    } catch (error) {
      console.error('Failed to load campaigns', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
      draft: 'default',
      active: 'success',
      paused: 'warning',
      completed: 'primary',
    };
    return colors[status] || 'default';
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ProfilePays - {user?.userType === 'advertiser' ? 'Advertiser' : 'Member'} Dashboard
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">
            {user?.userType === 'advertiser' ? 'My Campaigns' : 'Available Campaigns'}
          </Typography>
          {user?.userType === 'advertiser' && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/campaigns/new')}
            >
              New Campaign
            </Button>
          )}
        </Box>

        {loading ? (
          <Typography>Loading...</Typography>
        ) : campaigns.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary">
              {user?.userType === 'advertiser'
                ? 'No campaigns yet. Create your first campaign!'
                : 'No active campaigns available at the moment.'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {campaigns.map(campaign => (
              <Grid item xs={12} md={6} lg={4} key={campaign.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {campaign.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, minHeight: 40 }}
                    >
                      {campaign.description}
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        label={campaign.status}
                        color={getStatusColor(campaign.status)}
                        size="small"
                      />
                    </Box>
                    <Typography variant="body2">Budget: ${campaign.budget.toFixed(2)}</Typography>
                    <Typography variant="body2">Spent: ${campaign.spent.toFixed(2)}</Typography>
                    <Typography variant="body2">
                      Impressions: {campaign.impressions} | Clicks: {campaign.clicks}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </>
  );
}
