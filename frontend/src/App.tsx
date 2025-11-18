import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Container, Box, Typography } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
          <Typography variant="h5" component="p" color="text.secondary" gutterBottom>
            A social-advertising platform that pays users for temporarily swapping their profile
            pictures with brand-sponsored images
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Application is in development. Stay tuned!
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
