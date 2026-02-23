import { Avatar, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material';

const teamMembers = [
  { name: 'Cam Morgan', role: 'Co-founder', initials: 'CM' },
  { name: 'Ari Patel', role: 'Co-founder', initials: 'AP' },
  { name: 'Sky Rivera', role: 'Partner', initials: 'SR' },
  { name: 'Dev Kim', role: 'Lead Engineer', initials: 'DK' },
];

const pressMentions = [
  'TechCrunch – social ads reinvented',
  'Bloomberg – creators unlocking new income',
  'WIRED – future of profile monetization',
];

const AboutPage = () => {
  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="overline" color="success.main" fontWeight={700}>
          Page 3c · About Us
        </Typography>
        <Typography variant="h2">We believe profile real estate should pay you back.</Typography>
        <Typography variant="body1" color="text.secondary">
          ProfilePays was founded by adtech veterans and creators who wanted a fairer exchange
          between people and brands. Our mission is to help every user earn from their influence, no
          matter their follower count.
        </Typography>
      </Stack>
      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Our Mission
              </Typography>
              <Typography variant="body1" color="text.secondary">
                We&apos;re rethinking how advertising works by giving people agency over their
                profile identities. Advertisers get real reach, and members get paid instantly. We
                build with transparency, safety, and community impact in mind.
              </Typography>
              <Divider sx={{ my: 3 }} />
              <Grid container spacing={3}>
                {teamMembers.map(member => (
                  <Grid item xs={12} sm={6} key={member.name}>
                    <Stack spacing={1.5} alignItems="flex-start">
                      <Avatar
                        sx={{ bgcolor: 'success.main', width: 56, height: 56, fontWeight: 600 }}
                      >
                        {member.initials}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {member.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.role}
                      </Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  ProfilePays in the news
                </Typography>
                {pressMentions.map(mention => (
                  <Typography key={mention} variant="body2" color="text.secondary">
                    {mention}
                  </Typography>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default AboutPage;
