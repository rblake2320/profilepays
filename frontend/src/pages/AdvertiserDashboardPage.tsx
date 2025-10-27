import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { CloudUploadIcon } from '../components/common/icons';
import InfoPanel from '../components/common/InfoPanel';

const AdvertiserDashboardPage = () => {
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="overline" color="success.main" fontWeight={700}>
          Page 2a · Advertiser Back Office
        </Typography>
        <Typography variant="h2">Launch a campaign in minutes.</Typography>
        <Typography variant="body1" color="text.secondary">
          Upload creatives, define targeting, and instantly match with users eager to promote your
          brand.
        </Typography>
      </Stack>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ minHeight: 420 }}>
            <CardHeader
              title="Upload Ads"
              subheader="Drag and drop your profile creative or choose from your saved library"
              action={<Chip color="success" label="Step 1" />}
            />
            <CardContent>
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'success.light',
                  borderRadius: 4,
                  py: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  background: 'rgba(46, 125, 50, 0.04)',
                }}
              >
                <CloudUploadIcon color="success" sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drop your creative here
                </Typography>
                <Typography variant="body2" color="text.secondary" maxWidth={360}>
                  Upload JPG, PNG, or GIF files up to 5MB. We will automatically convert them for
                  optimized profile placement.
                </Typography>
                <Button variant="contained" color="success" sx={{ mt: 3 }}>
                  Browse Files
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            <InfoPanel
              title="Campaign checklist"
              items={[
                'Upload 3+ creative variations',
                'Select targeting by interest & location',
                'Set payout per swap and flight dates',
              ]}
            />
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Need inspiration?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Explore the Marketplace tab to see what users are actively selecting and
                    replicate top-performing themes.
                  </Typography>
                  <Button variant="outlined" color="success" size="small">
                    View Marketplace
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AdvertiserDashboardPage;
