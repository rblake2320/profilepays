import { useSelector } from 'react-redux';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';
import { RootState } from '../../store';

const EarningsPage = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        My Earnings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Earnings
              </Typography>
              <Typography variant="h3" fontWeight={600} color="success.main">
                ${user?.totalEarnings || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Available Balance
              </Typography>
              <Typography variant="h3" fontWeight={600} color="primary.main">
                ${user?.availableBalance || '0.00'}
              </Typography>
              <Button variant="contained" sx={{ mt: 2 }}>
                Request Payout
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment History
              </Typography>
              <Typography color="text.secondary">
                No payment history available.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EarningsPage;
