import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { campaignsApi } from '../../services/api';

interface Campaign {
  id: string;
  title: string;
  description: string;
  sponsoredImageUrl: string;
  budget: number;
  payoutPerUser: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface CampaignsState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  userCampaigns: Campaign[];
  participations: any[];
  isLoading: boolean;
  error: string | null;
  total: number;
}

const initialState: CampaignsState = {
  campaigns: [],
  currentCampaign: null,
  userCampaigns: [],
  participations: [],
  isLoading: false,
  error: null,
  total: 0,
};

export const fetchCampaigns = createAsyncThunk(
  'campaigns/fetchAll',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number }) => {
    const response = await campaignsApi.getAll(page, limit);
    return response;
  }
);

export const fetchCampaignById = createAsyncThunk(
  'campaigns/fetchById',
  async (id: string) => {
    const response = await campaignsApi.getById(id);
    return response;
  }
);

export const createCampaign = createAsyncThunk(
  'campaigns/create',
  async (campaignData: any, { rejectWithValue }) => {
    try {
      const response = await campaignsApi.create(campaignData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create campaign');
    }
  }
);

export const joinCampaign = createAsyncThunk(
  'campaigns/join',
  async (campaignId: string, { rejectWithValue }) => {
    try {
      const response = await campaignsApi.join(campaignId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to join campaign');
    }
  }
);

const campaignsSlice = createSlice({
  name: 'campaigns',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.campaigns = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch campaigns';
      })
      .addCase(fetchCampaignById.fulfilled, (state, action) => {
        state.currentCampaign = action.payload;
      })
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.userCampaigns.unshift(action.payload);
      });
  },
});

export const { clearError } = campaignsSlice.actions;
export default campaignsSlice.reducer;
