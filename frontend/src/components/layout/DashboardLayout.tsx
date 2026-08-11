import React, { useState, useEffect } from 'react';
import { PageRoute } from '../../App';
import { AuthUser } from '../../services/auth';
import Sidebar from './Sidebar';
import Header from './Header';
import OnboardingModal from '../onboarding/OnboardingModal';
import FloatingAssistant from '../ui/FloatingAssistant';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  user?: AuthUser | null;
}

export default function DashboardLayout({ children, currentRoute, onNavigate, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && (!user.profile_data || !user.profile_data.onboarding_completed)) {
      setShowOnboarding(true);
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        user={user}
      />

      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header setSidebarOpen={setSidebarOpen} />

        <main className={`flex-1 overflow-y-auto ${currentRoute === 'doctor' ? '' : 'p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full'}`}>
          {children}
        </main>
      </div>
      
      <FloatingAssistant />

      {showOnboarding && user && (
        <OnboardingModal 
          userName={user.name} 
          onComplete={(data) => {
            setShowOnboarding(false);
            if (user) {
              user.profile_data = data;
              localStorage.setItem('skinai_user', JSON.stringify(user));
            }
          }} 
        />
      )}
    </div>
  );
}
