import React from 'react';
import { LayoutDashboard, ScanLine, History, Settings, LogOut, Activity } from 'lucide-react';
import { PageRoute } from '../../App';

interface DashboardShellProps {
  children: React.ReactNode;
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onLogout: () => void;
}

export default function DashboardShell({ children, currentRoute, onNavigate, onLogout }: DashboardShellProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scan', label: 'Start Scan', icon: ScanLine },
    { id: 'history', label: 'Clinical History', icon: History },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[#E2E8F0] flex flex-col p-8 z-20">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-[#1E3A8A] rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">SkinAI<span className="text-[#1E3A8A]">.</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as PageRoute)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                currentRoute === item.id 
                  ? 'bg-blue-50 text-[#1E3A8A]' 
                  : 'text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]'
              }`}
            >
              <item.icon className={`w-5 h-5 ${currentRoute === item.id ? 'text-[#1E3A8A]' : ''}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all mt-auto"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-white overflow-y-auto relative">
        <div className="p-12 max-w-6xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
