import { Box, Typography, Button, Container, Grid, Card, CardContent } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { TrendingUp, Business, AccountBalance } from '@mui/icons-material';

const HomePage = () => {
  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
          color: 'white',
          py: 12,
          px: 2,
          textAlign: 'center',
          mb: 8,
          borderRadius: 2,
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom fontWeight={700}>
            Turn Your Profile Into Profit
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Get paid for temporarily swapping your profile picture with brand-sponsored images
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              component={RouterLink}
              to="/register"
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              component={RouterLink}
              to="/campaigns"
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Browse Campaigns
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg">
        <Typography variant="h3" align="center" gutterBottom fontWeight={600} sx={{ mb: 6 }}>
          How It Works
        </Typography>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 4 }}>
                <TrendingUp sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  For Creators
                </Typography>
                <Typography color="text.secondary">
                  Browse campaigns, join the ones you like, and earn money by temporarily changing your profile picture
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 4 }}>
                <Business sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  For Businesses
                </Typography>
                <Typography color="text.secondary">
                  Create targeted campaigns, set your budget, and reach your audience through authentic social profiles
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 4 }}>
                <AccountBalance sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom fontWeight={600}>
                  Secure Payments
                </Typography>
                <Typography color="text.secondary">
                  Automatic payouts through PayPal and secure payment processing via Stripe for businesses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* CTA */}
        <Box
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            p: 6,
            borderRadius: 2,
            textAlign: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Ready to Get Started?
          </Typography>
          <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
            Join thousands of users already earning with ProfilePays
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/register"
            sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Sign Up Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;
