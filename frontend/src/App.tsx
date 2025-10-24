import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { RootState } from './store';

// Layout
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import CampaignsPage from './pages/campaigns/CampaignsPage';
import CampaignDetailPage from './pages/campaigns/CampaignDetailPage';
import CreateCampaignPage from './pages/campaigns/CreateCampaignPage';
import ProfilePage from './pages/profile/ProfilePage';
import EarningsPage from './pages/earnings/EarningsPage';
import NotFoundPage from './pages/NotFoundPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="campaigns/create"
            element={
              <ProtectedRoute>
                <CreateCampaignPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="earnings"
            element={
              <ProtectedRoute>
                <EarningsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Box>
  );
}

export default App;
