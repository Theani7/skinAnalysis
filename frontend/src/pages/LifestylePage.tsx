import React from 'react';
import LifestyleWidget from '../components/dashboard/LifestyleWidget';
import { Activity } from 'lucide-react';

export default function LifestylePage() {
  return (
    <div className="w-full h-full p-4 md:p-8 max-w-7xl mx-auto flex flex-col items-center">
      <div className="flex items-center gap-3 w-full max-w-2xl mb-8">
        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
          <Activity className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Lifestyle Tracker</h1>
          <p className="text-sm text-gray-500">Track your daily water and sleep habits to see how they affect your skin over time.</p>
        </div>
      </div>
      
      <div className="w-full max-w-2xl h-[400px]">
        <LifestyleWidget />
      </div>
    </div>
  );
}
