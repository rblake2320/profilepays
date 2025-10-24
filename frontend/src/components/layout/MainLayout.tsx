import { Outlet } from 'react-router-dom';
import { Box, Container, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

const MainLayout = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit', fontWeight: 700 }}
          >
            ProfilePays
          </Typography>

          <Button color="inherit" component={RouterLink} to="/campaigns">
            Campaigns
          </Button>

          {isAuthenticated ? (
            <>
              <Button color="inherit" component={RouterLink} to="/dashboard">
                Dashboard
              </Button>
              <Button color="inherit" component={RouterLink} to="/profile">
                Profile
              </Button>
              {user?.userType === 'business' && (
                <Button color="inherit" component={RouterLink} to="/campaigns/create">
                  Create Campaign
                </Button>
              )}
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                Login
              </Button>
              <Button
                variant="contained"
                color="secondary"
                component={RouterLink}
                to="/register"
                sx={{ ml: 1 }}
              >
                Sign Up
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) => theme.palette.grey[200],
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} ProfilePays. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
