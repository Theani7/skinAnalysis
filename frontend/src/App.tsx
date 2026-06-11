import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardShell from './components/layout/DashboardShell';
import DashboardHome from './pages/DashboardHome';
import ScanView from './pages/ScanView';
import ReportView from './pages/ReportView';
import HistoryPage from './pages/HistoryPage';
import { AnalysisResponse } from './services/api';

export type PageRoute = 'landing' | 'login' | 'dashboard' | 'scan' | 'report' | 'history';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageRoute>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  // Simple Router Logic
  const navigate = (page: PageRoute) => {
    window.scrollTo(0, 0);
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    navigate('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAnalysisResult(null);
    navigate('landing');
  };

  const handleAnalysisComplete = (result: AnalysisResponse) => {
    setAnalysisResult(result);
    navigate('report');
  };

  // Unauthenticated Routes
  if (!isAuthenticated) {
    if (currentPage === 'login') return <LoginPage onLogin={handleLogin} onBack={() => navigate('landing')} />;
    return <LandingPage onStart={() => navigate('login')} />;
  }

  // Authenticated Dashboard Layout
  return (
    <DashboardShell currentRoute={currentPage} onNavigate={navigate} onLogout={handleLogout}>
      {currentPage === 'dashboard' && <DashboardHome onStartScan={() => navigate('scan')} />}
      {currentPage === 'scan' && <ScanView onComplete={handleAnalysisComplete} />}
      {currentPage === 'report' && <ReportView result={analysisResult} onBack={() => navigate('dashboard')} />}
      {currentPage === 'history' && <HistoryPage />}
    </DashboardShell>
  );
}
