import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { AppDispatch } from '../../store';
import { createCampaign } from '../../store/slices/campaignsSlice';

interface CampaignFormData {
  title: string;
  description: string;
  sponsoredImageUrl: string;
  targetLink: string;
  budget: number;
  payoutPerUser: number;
  maxParticipants: number;
  startDate: string;
  endDate: string;
}

const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { register, handleSubmit, formState: { errors } } = useForm<CampaignFormData>();

  const onSubmit = async (data: CampaignFormData) => {
    const campaignData = {
      ...data,
      targetAudience: {},
    };

    const result = await dispatch(createCampaign(campaignData));
    if (createCampaign.fulfilled.match(result)) {
      alert('Campaign created successfully!');
      navigate('/dashboard');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Create New Campaign
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Set up your advertising campaign
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Campaign Title"
                  fullWidth
                  {...register('title', { required: 'Title is required' })}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={4}
                  {...register('description', { required: 'Description is required' })}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Sponsored Image URL"
                  fullWidth
                  {...register('sponsoredImageUrl', { required: 'Image URL is required' })}
                  error={!!errors.sponsoredImageUrl}
                  helperText={errors.sponsoredImageUrl?.message}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Target Link (optional)"
                  fullWidth
                  {...register('targetLink')}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Total Budget ($)"
                  type="number"
                  fullWidth
                  {...register('budget', { required: 'Budget is required', min: 1 })}
                  error={!!errors.budget}
                  helperText={errors.budget?.message}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Payout per User ($)"
                  type="number"
                  fullWidth
                  {...register('payoutPerUser', { required: 'Payout is required', min: 0.01 })}
                  error={!!errors.payoutPerUser}
                  helperText={errors.payoutPerUser?.message}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Max Participants"
                  type="number"
                  fullWidth
                  {...register('maxParticipants', { min: 1 })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Start Date"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register('startDate', { required: 'Start date is required' })}
                  error={!!errors.startDate}
                  helperText={errors.startDate?.message}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="End Date"
                  type="datetime-local"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...register('endDate', { required: 'End date is required' })}
                  error={!!errors.endDate}
                  helperText={errors.endDate?.message}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" size="large">
                    Create Campaign
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateCampaignPage;
