import api from './api';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  budget: number;
  spent: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  impressions: number;
  clicks: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDto {
  title: string;
  description: string;
  imageUrl?: string;
  budget: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateCampaignDto {
  title?: string;
  description?: string;
  imageUrl?: string;
  budget?: number;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
}

export const campaignService = {
  async getAll(): Promise<Campaign[]> {
    const { data } = await api.get('/campaigns');
    return data;
  },

  async getMyCampaigns(): Promise<Campaign[]> {
    const { data } = await api.get('/campaigns/my-campaigns');
    return data;
  },

  async getById(id: string): Promise<Campaign> {
    const { data } = await api.get(`/campaigns/${id}`);
    return data;
  },

  async create(campaignData: CreateCampaignDto): Promise<Campaign> {
    const { data } = await api.post('/campaigns', campaignData);
    return data;
  },

  async update(id: string, campaignData: UpdateCampaignDto): Promise<Campaign> {
    const { data } = await api.patch(`/campaigns/${id}`, campaignData);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  async trackImpression(id: string): Promise<void> {
    await api.post(`/campaigns/${id}/impression`);
  },

  async trackClick(id: string): Promise<void> {
    await api.post(`/campaigns/${id}/click`);
  },
};
