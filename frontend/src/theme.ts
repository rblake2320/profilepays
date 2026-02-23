import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1b5e20',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ffd54f',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#f7faf7',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.75rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: '1.5rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(27, 94, 32, 0.12)',
        },
      },
    },
  },
});

export default theme;
