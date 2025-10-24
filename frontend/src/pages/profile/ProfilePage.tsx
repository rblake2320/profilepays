import { useSelector } from 'react-redux';
import { Box, Typography, Card, CardContent, Avatar, Grid, Chip } from '@mui/material';
import { RootState } from '../../store';

const ProfilePage = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) return null;

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        My Profile
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                src={user.profilePictureUrl}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              />
              <Typography variant="h6">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                @{user.username}
              </Typography>
              <Chip label={user.userType} color="primary" size="small" />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{user.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Username
                  </Typography>
                  <Typography variant="body1">{user.username}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Account Type
                  </Typography>
                  <Typography variant="body1">{user.userType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Subscription Tier
                  </Typography>
                  <Typography variant="body1">
                    {user.subscriptionTier || 'basic'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
