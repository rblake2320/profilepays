import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import campaignsReducer from './slices/campaignsSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    campaigns: campaignsReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
