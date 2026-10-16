import SessionBootstrap from './components/SessionBootstrap';
import PlacementsPage from './pages/PlacementsPage';
import PlacementReviewPage from './pages/PlacementReviewPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';
import SupportPage from './pages/SupportPage';

const App = () => {
  return (
    <Provider store={store}>
      <SessionBootstrap>
        <Routes>
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <SupportPage />
              </ProtectedRoute>
            }
          />
          <Route path="/support/share" element={<SupportPage mode="share" />} />
          <Route path="/support/view" element={<SupportPage mode="view" />} />
          <Route path="/" element={<AppLayout />}>
            <Route
              path="reviews"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <PlacementReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="placements"
              element={
                <ProtectedRoute allowedRoles={['member', 'admin']}>
                  <PlacementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="connections"
              element={
                <ProtectedRoute allowedRoles={['member', 'admin']}>
                  <PlacementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="earnings"
              element={
                <ProtectedRoute allowedRoles={['member', 'admin']}>
                  <PlacementsPage />
                </ProtectedRoute>
              }
            />
            {/* Public routes */}
            <Route index element={<PlacementsPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="about" element={<AboutPage />} />

            {/* Advertiser-only routes */}
            <Route
              path="advertisers"
              element={
                <ProtectedRoute allowedRoles={['advertiser', 'admin']}>
                  <PlacementsPage />
                </ProtectedRoute>
              }
            />

            {/* Member routes */}
            <Route
              path="marketplace"
              element={
                <ProtectedRoute allowedRoles={['member', 'admin']}>
                  <PlacementsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="confirmation"
              element={
                <ProtectedRoute allowedRoles={['member', 'admin']}>
                  <PlacementsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SessionBootstrap>
    </Provider>
  );
};

export default App;
