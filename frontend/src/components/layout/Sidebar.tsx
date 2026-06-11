import { Scan, Camera, Zap, LayoutDashboard } from 'lucide-react';
import { Page } from '../../types';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const navItems: { icon: any; label: string; id: Page }[] = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'landing' },
    { icon: Scan, label: 'Deep Analysis', id: 'analyze' },
    { icon: Camera, label: 'Quick Scan', id: 'camera' },
    { icon: Zap, label: 'Preprocessing', id: 'preprocess' },
  ];

  return (
    <aside className="w-64 h-full glass-sidebar flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
          <Scan className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">SkinAI</span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activePage === item.id 
                ? 'bg-emerald-600/10 text-emerald-500 font-semibold' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
          System Status
        </div>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400">AI Model Loaded</span>
        </div>
      </div>
    </aside>
  );
}
