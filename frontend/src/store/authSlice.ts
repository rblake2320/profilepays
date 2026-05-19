import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';

export type SubscriptionTier = 'basic' | 'standard' | 'premium' | 'elite';

export interface AuthUser {
  id: string;
  email: string;
  userType: 'member' | 'advertiser' | 'admin';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  subscriptionTier?: SubscriptionTier;
  walletBalance?: number;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: false,
  error: null,
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      return await authApi.register(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      return await authApi.login(payload);
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  },
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.getMe();
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user');
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    },
    clearError(state) {
      state.error = null;
    },
    updateWalletBalance(state, action: PayloadAction<number>) {
      if (state.user) {
        state.user.walletBalance = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user as AuthUser;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user as AuthUser;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload as AuthUser;
        localStorage.setItem('user', JSON.stringify(action.payload));
      });
  },
});

export const { logout, clearError, updateWalletBalance } = authSlice.actions;
export default authSlice.reducer;
