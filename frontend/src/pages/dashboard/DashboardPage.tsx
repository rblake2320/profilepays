import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Box, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AccountBalance, Campaign, TrendingUp } from '@mui/icons-material';
import { RootState } from '../../store';

const DashboardPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Welcome back, {user?.firstName || user?.username}!
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalance sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Total Earnings</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600}>
                ${user?.totalEarnings || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Available Balance</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600}>
                ${user?.availableBalance || '0.00'}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to="/earnings"
                sx={{ mt: 2 }}
              >
                Request Payout
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Campaign sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">Active Campaigns</Typography>
              </Box>
              <Typography variant="h4" fontWeight={600}>
                0
              </Typography>
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to="/campaigns"
                sx={{ mt: 2 }}
              >
                Browse Campaigns
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {user?.userType === 'business' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                component={RouterLink}
                to="/campaigns/create"
              >
                Create New Campaign
              </Button>
              <Button variant="outlined" component={RouterLink} to="/campaigns">
                View My Campaigns
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Activity
          </Typography>
          <Typography color="text.secondary">
            No recent activity to display.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default DashboardPage;
