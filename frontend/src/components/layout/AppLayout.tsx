import { PropsWithChildren } from 'react';
import { Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { MenuLinesIcon, MoneyBadgeIcon } from '../common/icons';

const navigationLinks = [
  { label: 'Home', path: '/' },
  { label: 'Advertisers', path: '/advertisers' },
  { label: 'Marketplace', path: '/marketplace' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'About', path: '/about' },
];

const AppLayout = ({ children }: PropsWithChildren) => {
  const location = useLocation();

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="background.default">
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 3 }}>
          <IconButton
            edge="start"
            color="inherit"
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuLinesIcon />
          </IconButton>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'inherit' }}
          >
            <MoneyBadgeIcon color="success" />
            <Typography variant="h6" fontWeight={700} color="text.primary">
              ProfilePays
            </Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}
          >
            {navigationLinks.map(link => (
              <Button
                key={link.path}
                component={RouterLink}
                to={link.path}
                color={location.pathname === link.path ? 'success' : 'inherit'}
                variant={location.pathname === link.path ? 'contained' : 'text'}
                size="small"
              >
                {link.label}
              </Button>
            ))}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/advertisers" variant="outlined" size="small">
              Advertiser Login
            </Button>
            <Button
              component={RouterLink}
              to="/marketplace"
              variant="contained"
              color="success"
              size="small"
            >
              Join Payout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
        {children ?? <Outlet />}
      </Container>
      <Divider />
      <Box component="footer" py={3} bgcolor="background.paper">
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} ProfilePays. Turn your profile into profit.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Privacy
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Terms
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Contact
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;
