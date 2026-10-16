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

function normalize(data: any): AuthResponse {
  return { ...data, user: { ...data.user, userType: data.user.userRole } };
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient
      .post('/auth/signup', {
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        userRole: payload.userType,
        ...(payload.userType === 'advertiser' ? { companyName: payload.companyName } : {}),
      })
      .then(r => normalize(r.data)),

  login: (payload: LoginPayload) =>
    apiClient.post('/auth/login', payload).then(r => normalize(r.data)),

  getMe: () => apiClient.get('/users/me').then(r => normalize({ user: r.data }).user),
};
