import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { usersApi } from '../../services/api';

interface UserState {
  profile: any;
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async ({ id, data }: { id: string; data: any }, { rejectWithValue }) => {
    try {
      const response = await usersApi.update(id, data);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default userSlice.reducer;
