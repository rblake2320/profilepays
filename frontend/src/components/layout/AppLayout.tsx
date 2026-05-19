import { useState } from 'react';
import { Outlet, Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { MenuLinesIcon, MoneyBadgeIcon } from '../common/icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout } from '../../store/authSlice';

const navigationLinks = [
  { label: 'Home', path: '/' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'About', path: '/about' },
];

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    dispatch(logout());
    navigate('/');
  };

  const userInitials = user
    ? (user.firstName?.[0] || user.email[0]).toUpperCase()
    : '';

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={700} sx={{ my: 2 }} color="success.main">
        ProfilePays
      </Typography>
      <Divider />
      <List>
        {navigationLinks.map((link) => (
          <ListItem key={link.path} disablePadding>
            <ListItemButton component={RouterLink} to={link.path} selected={location.pathname === link.path}>
              <ListItemText primary={link.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {user?.userType === 'advertiser' && (
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/advertisers">
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </ListItem>
        )}
        {user?.userType === 'member' && (
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/marketplace">
              <ListItemText primary="Marketplace" />
            </ListItemButton>
          </ListItem>
        )}
        {!user && (
          <>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/login">
                <ListItemText primary="Sign In" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/register">
                <ListItemText primary="Sign Up" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Box display="flex" flexDirection="column" minHeight="100vh" bgcolor="background.default">
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleDrawerToggle}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            aria-label="Open navigation menu"
          >
            <MenuLinesIcon />
          </IconButton>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            component={RouterLink}
            to="/"
            sx={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
          >
            <MoneyBadgeIcon color="success" />
            <Typography variant="h6" fontWeight={700} color="text.primary">
              ProfilePays
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}
          >
            {navigationLinks.map((link) => (
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
            {user?.userType === 'advertiser' && (
              <Button
                component={RouterLink}
                to="/advertisers"
                color={location.pathname === '/advertisers' ? 'success' : 'inherit'}
                variant={location.pathname === '/advertisers' ? 'contained' : 'text'}
                size="small"
              >
                Dashboard
              </Button>
            )}
            {user?.userType === 'member' && (
              <Button
                component={RouterLink}
                to="/marketplace"
                color={location.pathname === '/marketplace' ? 'success' : 'inherit'}
                variant={location.pathname === '/marketplace' ? 'contained' : 'text'}
                size="small"
              >
                Marketplace
              </Button>
            )}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            {user ? (
              <>
                <Tooltip title={user.email}>
                  <IconButton onClick={handleMenuOpen} size="small">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.main', fontSize: 14 }}>
                      {userInitials}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {user.email}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  {user.userType === 'member' && (
                    <MenuItem>
                      <Typography variant="body2">
                        Wallet: ${Number(user.walletBalance || 0).toFixed(2)}
                      </Typography>
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  size="small"
                  sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Sign in
                </Button>
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  color="success"
                  size="small"
                >
                  Get started
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>

      <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
        <Outlet />
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
              <Link component={RouterLink} to="/privacy" variant="body2" color="text.secondary" underline="hover">
                Privacy
              </Link>
              <Link component={RouterLink} to="/terms" variant="body2" color="text.secondary" underline="hover">
                Terms
              </Link>
              <Link href="mailto:support@profilepays.com" variant="body2" color="text.secondary" underline="hover">
                Contact
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
};

export default AppLayout;
