import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Typography, Button, Grid, Card, CardContent } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to ProfilePays
        </Typography>
        <Typography variant="h5" component="p" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Get paid to change your profile picture or reach millions of users with your brand
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/register')}
            sx={{ mr: 2 }}
          >
            Get Started
          </Button>
          <Button variant="outlined" size="large" onClick={() => navigate('/login')}>
            Login
          </Button>
        </Box>

        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  For Members
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Earn money by temporarily changing your profile picture to sponsor-approved
                  images. It's easy, fun, and rewarding!
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  For Advertisers
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Reach real people with authentic social advertising. Create campaigns and watch
                  your brand spread across social media platforms.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
