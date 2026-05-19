import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Grid,
  InputAdornment, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { campaignsApi, Campaign } from '../api/campaigns';
import { useAppSelector } from '../hooks/redux';

const campaignSchema = yup.object({
  title: yup.string().required('Campaign title is required'),
  description: yup.string().optional(),
  budget: yup.number().min(50, 'Minimum budget is $50').required('Budget is required'),
  payoutPerSwap: yup.number().min(1, 'Minimum payout is $1').required('Payout per swap is required'),
  durationHours: yup.number().min(1).max(720).required('Duration is required'),
  maxParticipants: yup.number().min(1).optional(),
  targetCountry: yup.string().optional(),
  industry: yup.string().optional(),
});

type CampaignFormData = yup.InferType<typeof campaignSchema>;

const statusColors: Record<string, any> = {
  draft: 'default', pending_review: 'warning', active: 'success',
  paused: 'warning', completed: 'info', cancelled: 'error',
};

const AdvertiserDashboardPage = () => {
  const { user } = useAppSelector((s) => s.auth);
  const [tab, setTab] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CampaignFormData>({
    resolver: yupResolver(campaignSchema),
  });

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await campaignsApi.getMyCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const onCreateSubmit = async (data: CampaignFormData) => {
    try {
      setCreating(true);
      setCreateError(null);
      await campaignsApi.create(data as any);
      reset();
      setCreateOpen(false);
      await fetchCampaigns();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (action: 'activate' | 'pause' | 'end', id: string) => {
    setActionLoading(id);
    try {
      if (action === 'activate') await campaignsApi.activate(id);
      else if (action === 'pause') await campaignsApi.pause(id);
      else await campaignsApi.end(id);
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action} campaign`);
    } finally {
      setActionLoading(null);
    }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === 'active');
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft' || c.status === 'paused');
  const completedCampaigns = campaigns.filter((c) => ['completed', 'cancelled'].includes(c.status));
  const totalSpent = campaigns.reduce((s, c) => s + Number(c.budgetSpent || 0), 0);
  const totalBudget = campaigns.reduce((s, c) => s + Number(c.budget || 0), 0);

  const tabCampaigns = tab === 0 ? activeCampaigns : tab === 1 ? draftCampaigns : completedCampaigns;

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="success.main" fontWeight={700}>Advertiser Dashboard</Typography>
          <Typography variant="h4" fontWeight={700}>
            Welcome back{user?.companyName ? `, ${user.companyName}` : ''}
          </Typography>
          <Typography variant="body1" color="text.secondary">Manage your campaigns and track performance</Typography>
        </Stack>
        <Button variant="contained" color="success" size="large" onClick={() => setCreateOpen(true)}>
          + New Campaign
        </Button>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={3}>
        {[
          { label: 'Total Campaigns', value: campaigns.length },
          { label: 'Active Campaigns', value: activeCampaigns.length },
          { label: 'Total Budget', value: `$${totalBudget.toFixed(2)}` },
          { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}` },
        ].map((stat) => (
          <Grid item xs={6} md={3} key={stat.label}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h5" fontWeight={700} color="success.main">{stat.value}</Typography>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit">
          <Tab label={`Active (${activeCampaigns.length})`} />
          <Tab label={`Drafts/Paused (${draftCampaigns.length})`} />
          <Tab label={`Completed (${completedCampaigns.length})`} />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress color="success" /></Box>
      ) : (
        <Stack spacing={2}>
          {tabCampaigns.map((campaign) => (
            <Card key={campaign.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={2}>
                  <Stack spacing={1} flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle1" fontWeight={600}>{campaign.title}</Typography>
                      <Chip label={campaign.status.replace('_', ' ')} color={statusColors[campaign.status]} size="small" />
                    </Stack>
                    {campaign.description && (
                      <Typography variant="body2" color="text.secondary">{campaign.description}</Typography>
                    )}
                    <Stack direction="row" spacing={3} flexWrap="wrap">
                      <Typography variant="body2">Budget: <strong>${Number(campaign.budget).toFixed(2)}</strong></Typography>
                      <Typography variant="body2">Spent: <strong>${Number(campaign.budgetSpent).toFixed(2)}</strong></Typography>
                      <Typography variant="body2">Payout: <strong>${Number(campaign.payoutPerSwap).toFixed(2)}/swap</strong></Typography>
                      <Typography variant="body2">Duration: <strong>{campaign.durationHours}h</strong></Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1} flexShrink={0}>
                    {(campaign.status === 'draft' || campaign.status === 'paused') && (
                      <Button size="small" variant="contained" color="success"
                        onClick={() => handleAction('activate', campaign.id)}
                        disabled={actionLoading === campaign.id}>
                        {actionLoading === campaign.id ? <CircularProgress size={16} /> : campaign.status === 'paused' ? 'Resume' : 'Activate'}
                      </Button>
                    )}
                    {campaign.status === 'active' && (
                      <>
                        <Button size="small" variant="outlined" onClick={() => handleAction('pause', campaign.id)} disabled={actionLoading === campaign.id}>Pause</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleAction('end', campaign.id)} disabled={actionLoading === campaign.id}>End</Button>
                      </>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
          {tabCampaigns.length === 0 && (
            <Box textAlign="center" py={6}>
              <Typography color="text.secondary">
                {tab === 0 ? 'No active campaigns. Create one to get started!' : tab === 1 ? 'No draft or paused campaigns.' : 'No completed campaigns yet.'}
              </Typography>
            </Box>
          )}
        </Stack>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onCreateSubmit)}>
          <DialogContent>
            <Stack spacing={2} pt={1}>
              {createError && <Alert severity="error">{createError}</Alert>}
              <TextField label="Campaign Title" fullWidth required error={!!errors.title} helperText={errors.title?.message} {...register('title')} />
              <TextField label="Description" fullWidth multiline rows={3} error={!!errors.description} helperText={errors.description?.message} {...register('description')} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Total Budget" type="number" fullWidth required
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  error={!!errors.budget} helperText={errors.budget?.message || 'Min $50'}
                  {...register('budget', { valueAsNumber: true })} />
                <TextField label="Payout per Swap" type="number" fullWidth required
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  error={!!errors.payoutPerSwap} helperText={errors.payoutPerSwap?.message}
                  {...register('payoutPerSwap', { valueAsNumber: true })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Duration (hours)" type="number" fullWidth required
                  error={!!errors.durationHours} helperText={errors.durationHours?.message || '1–720 hours'}
                  {...register('durationHours', { valueAsNumber: true })} />
                <TextField label="Max Participants" type="number" fullWidth
                  error={!!errors.maxParticipants} helperText="Optional"
                  {...register('maxParticipants', { valueAsNumber: true })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Target Country" fullWidth {...register('targetCountry')} />
                <TextField label="Industry" fullWidth {...register('industry')} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={creating}
              startIcon={creating ? <CircularProgress size={16} color="inherit" /> : null}>
              {creating ? 'Creating…' : 'Create Campaign'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
};

export default AdvertiserDashboardPage;
