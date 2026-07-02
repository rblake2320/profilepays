import { Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdvertiserDashboardPage from './pages/AdvertiserDashboardPage';
import AdSelectionPage from './pages/AdSelectionPage';
import ConfirmationPage from './pages/ConfirmationPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';

const App = () => {
  return (
    <Provider store={store}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {/* Public routes */}
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="about" element={<AboutPage />} />

          {/* Advertiser-only routes */}
          <Route
            path="advertisers"
            element={
              <ProtectedRoute allowedRoles={['advertiser', 'admin']}>
                <AdvertiserDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Member routes */}
          <Route
            path="marketplace"
            element={
              <ProtectedRoute allowedRoles={['member', 'admin']}>
                <AdSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="confirmation"
            element={
              <ProtectedRoute>
                <ConfirmationPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Provider>
  );
};

export default App;
