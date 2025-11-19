import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { campaignService, Campaign } from '../services/campaign.service';

export default function CampaignForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (isEdit && id) {
      loadCampaign(id);
    }
  }, [id, isEdit]);

  const loadCampaign = async (campaignId: string) => {
    try {
      const data = await campaignService.getById(campaignId);
      setCampaign(data);
      setTitle(data.title);
      setDescription(data.description);
      setImageUrl(data.imageUrl || '');
      setBudget(data.budget.toString());
      setStartDate(data.startDate ? data.startDate.split('T')[0] : '');
      setEndDate(data.endDate ? data.endDate.split('T')[0] : '');
    } catch (err) {
      setError('Failed to load campaign');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const budgetNumber = parseFloat(budget);
    if (isNaN(budgetNumber) || budgetNumber <= 0) {
      setError('Budget must be a positive number');
      setLoading(false);
      return;
    }

    const campaignData = {
      title,
      description,
      imageUrl: imageUrl || undefined,
      budget: budgetNumber,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    try {
      if (isEdit && id) {
        await campaignService.update(id, campaignData);
      } else {
        await campaignService.create(campaignData);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} campaign`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      await campaignService.delete(id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h6">{isEdit ? 'Edit Campaign' : 'New Campaign'}</Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>
              {isEdit ? 'Edit Campaign' : 'Create New Campaign'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Campaign Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                margin="normal"
              />

              <TextField
                fullWidth
                label="Description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                margin="normal"
                multiline
                rows={4}
              />

              <TextField
                fullWidth
                label="Image URL (optional)"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                margin="normal"
                type="url"
              />

              <TextField
                fullWidth
                label="Budget ($)"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                required
                margin="normal"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
              />

              <TextField
                fullWidth
                label="Start Date (optional)"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                margin="normal"
                type="date"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="End Date (optional)"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                margin="normal"
                type="date"
                InputLabelProps={{ shrink: true }}
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ flex: 1 }}
                >
                  {loading
                    ? isEdit
                      ? 'Updating...'
                      : 'Creating...'
                    : isEdit
                      ? 'Update Campaign'
                      : 'Create Campaign'}
                </Button>

                {isEdit && (
                  <Button variant="outlined" color="error" size="large" onClick={handleDelete}>
                    Delete
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </>
  );
}
