import React from 'react';
import { Menu, Sparkles } from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  return (
    <header className="lg:hidden h-16 flex items-center justify-between px-4 bg-white border-b border-gray-200 z-20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-gray-900">SkinAI</span>
      </div>
      <button
        onClick={() => setSidebarOpen(true)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
}
