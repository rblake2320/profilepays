import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import AdvertiserDashboardPage from './pages/AdvertiserDashboardPage';
import AdSelectionPage from './pages/AdSelectionPage';
import ConfirmationPage from './pages/ConfirmationPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AboutPage from './pages/AboutPage';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="advertisers" element={<AdvertiserDashboardPage />} />
        <Route path="marketplace" element={<AdSelectionPage />} />
        <Route path="confirmation" element={<ConfirmationPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
