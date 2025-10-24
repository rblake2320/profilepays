import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: (theme) => theme.palette.background.default,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h3"
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 700 }}
          >
            ProfilePays
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Turn your profile into profit
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 4 }}>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
};

export default AuthLayout;
