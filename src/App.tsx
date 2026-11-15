import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { FirmsDataProvider } from './context/FirmsDataContext';
import { AcrylicForestBackdrop } from './components/AcrylicForestBackdrop';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { GlobalMapPage } from './pages/GlobalMapPage';
import { CalendarPage } from './pages/CalendarPage';
import { ActivityPage } from './pages/ActivityPage';
import { FeaturesPage } from './pages/FeaturesPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <FirmsDataProvider>
        <ScrollToTop />
        <div className="relative flex min-h-screen flex-col bg-void text-cream">
          <AcrylicForestBackdrop />
          <Navbar />
          <main className="relative z-10 flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<GlobalMapPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </FirmsDataProvider>
    </BrowserRouter>
  );
}
