import apiClient from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  userType: 'member' | 'advertiser';
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    userType: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    subscriptionTier?: string;
    walletBalance?: number;
  };
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', payload).then((r) => r.data),

  login: (payload: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', payload).then((r) => r.data),

  getMe: () =>
    apiClient.get<AuthResponse['user']>('/auth/me').then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken }).then((r) => r.data),
};
