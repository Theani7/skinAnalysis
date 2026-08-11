import React, { useState } from 'react';
import { PageRoute } from '../../App';
import { AuthUser } from '../../services/auth';
import ConfirmDialog from '../ui/ConfirmDialog';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
  user?: AuthUser | null;
}

export default function DashboardLayout({ children, currentRoute, onNavigate, onLogout, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentRoute={currentRoute}
        onNavigate={onNavigate}
        onLogoutClick={handleLogoutClick}
        user={user}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your dashboard."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
