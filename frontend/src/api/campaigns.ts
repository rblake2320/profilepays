import apiClient from './client';

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  budget: number;
  budgetSpent: number;
  payoutPerSwap: number;
  durationHours: number;
  maxParticipants?: number;
  status: 'draft' | 'pending_review' | 'active' | 'paused' | 'completed' | 'cancelled';
  targetCountry?: string;
  targetState?: string;
  targetMinAge?: number;
  targetMaxAge?: number;
  targetMinFollowers?: number;
  targetPlatforms?: string[];
  industry?: string;
  advertiser?: {
    id: string;
    email: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignPayload {
  title: string;
  description?: string;
  imageUrl?: string;
  budget: number;
  payoutPerSwap: number;
  durationHours: number;
  maxParticipants?: number;
  targetCountry?: string;
  targetState?: string;
  targetMinAge?: number;
  targetMaxAge?: number;
  targetMinFollowers?: number;
  targetPlatforms?: string[];
  industry?: string;
}

export interface PlatformStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalPaidOut: number;
  totalParticipations: number;
}

export const campaignsApi = {
  getMarketplace: () =>
    apiClient.get<Campaign[]>('/campaigns/marketplace').then((r) => r.data),

  getStats: () =>
    apiClient.get<PlatformStats>('/campaigns/stats').then((r) => r.data),

  getMyCampaigns: () =>
    apiClient.get<Campaign[]>('/campaigns/my').then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),

  create: (payload: CreateCampaignPayload) =>
    apiClient.post<Campaign>('/campaigns', payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateCampaignPayload>) =>
    apiClient.put<Campaign>(`/campaigns/${id}`, payload).then((r) => r.data),

  activate: (id: string) =>
    apiClient.put<Campaign>(`/campaigns/${id}/activate`).then((r) => r.data),

  pause: (id: string) =>
    apiClient.put<Campaign>(`/campaigns/${id}/pause`).then((r) => r.data),

  end: (id: string) =>
    apiClient.put<Campaign>(`/campaigns/${id}/end`).then((r) => r.data),

  participate: (id: string, platform: string) =>
    apiClient.post(`/campaigns/${id}/participate`, { platform }).then((r) => r.data),

  submitProof: (participationId: string, proofScreenshotUrl: string) =>
    apiClient
      .post(`/campaigns/participations/${participationId}/proof`, { proofScreenshotUrl })
      .then((r) => r.data),
};
