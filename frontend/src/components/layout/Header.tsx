import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
  return (
    <header className="lg:hidden h-16 flex items-center justify-between px-4 bg-white border-b border-gray-200 z-20">
      <div className="flex items-center gap-2">
        <span className="font-logo text-xl font-bold tracking-tight text-gray-900">Skin<span className="text-primary-700">AI</span></span>
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
