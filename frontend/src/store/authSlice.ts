import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi, LoginPayload, RegisterPayload } from '../api/auth';
import { clearSession, endSession, setAccessToken } from '../api/client';
import { authError } from '../utils/authError';
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
  isLoading: boolean;
  ready: boolean;
  error: string | null;
}
const initialState: AuthState = { user: null, isLoading: false, ready: false, error: null };
export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      const result = await authApi.register(payload);
      setAccessToken(result.accessToken);
      return result;
    } catch (err: any) {
      return rejectWithValue(authError(err, 'We could not create your account. Please try again.'));
    }
  }
);
export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      const result = await authApi.login(payload);
      setAccessToken(result.accessToken);
      return result;
    } catch (err: any) {
      return rejectWithValue(authError(err, 'We could not sign you in. Please try again.').message);
    }
  }
);
export const fetchCurrentUser = createAsyncThunk('auth/fetchMe', async () => authApi.getMe());
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await endSession();
  } catch {
    return rejectWithValue(
      'Sign-out could not be confirmed by the server. Check your connection and try again.'
    );
  }
});
const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionEnded(state) {
      clearSession();
      state.user = null;
      state.ready = true;
    },
    clearError(state) {
      state.error = null;
    },
    updateWalletBalance(state, action: PayloadAction<number>) {
      if (state.user) state.user.walletBalance = action.payload;
    },
  },
  extraReducers: b => {
    for (const action of [registerUser, loginUser]) {
      b.addCase(action.pending, state => {
        state.isLoading = true;
        state.error = null;
      });
      b.addCase(action.fulfilled, (state, action) => {
        state.isLoading = false;
        state.ready = true;
        state.user = action.payload.user as AuthUser;
      });
      b.addCase(action.rejected, (state, action) => {
        state.isLoading = false;
        const p = action.payload as any;
        state.error = typeof p === 'string' ? p : p?.message || 'Could not complete sign-in.';
      });
    }
    b.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.user = action.payload as AuthUser;
      state.ready = true;
    });
    b.addCase(fetchCurrentUser.rejected, state => {
      state.user = null;
      state.ready = true;
    });
    b.addCase(logout.pending, state => {
      state.isLoading = true;
      state.error = null;
    });
    b.addCase(logout.fulfilled, state => {
      state.user = null;
      state.isLoading = false;
      state.ready = true;
    });
    b.addCase(logout.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});
export const { sessionEnded, clearError, updateWalletBalance } = slice.actions;
export default slice.reducer;
