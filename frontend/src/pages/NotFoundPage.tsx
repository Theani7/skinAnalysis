import React from 'react';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { PageRoute } from '../App';

interface NotFoundPageProps {
  onNavigate: (route: PageRoute) => void;
}

export default function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-16 text-center animate-in fade-in duration-500">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary-100 blur-[40px] rounded-full opacity-50"></div>
        <div className="relative w-28 h-28 bg-white border border-gray-100 rounded-3xl flex items-center justify-center shadow-xl shadow-gray-200/50">
          <FileQuestion className="w-14 h-14 text-primary-500" />
        </div>
      </div>
      
      <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-4 tracking-tight">Page Not Found</h1>
      <p className="text-gray-500 max-w-md mx-auto text-lg mb-10 leading-relaxed">
        Oops! We couldn't find the page you were looking for. It might have been moved or doesn't exist anymore.
      </p>
      
      <button 
        onClick={() => onNavigate('dashboard')}
        className="flex items-center justify-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-base font-semibold transition-all shadow-lg shadow-primary-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      >
        <ArrowLeft className="w-5 h-5" />
        Return to Dashboard
      </button>
    </div>
  );
}
