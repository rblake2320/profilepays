import { Box, Typography, Button, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" fontWeight={700} color="primary.main">
          404
        </Typography>
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          The page you are looking for does not exist.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/" size="large">
          Go Home
        </Button>
      </Box>
    </Container>
  );
};

export default NotFoundPage;
