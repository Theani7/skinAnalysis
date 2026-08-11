import React, { useState, useEffect } from 'react';
import { Clock, Sun, Moon, Lightbulb, ListChecks, ArrowRight, Loader2 } from 'lucide-react';
import * as api from '../services/api';

interface RoutinePageProps {
  onStartScan: () => void;
}

export default function RoutinePage({ onStartScan }: RoutinePageProps) {
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<any>(null);

  useEffect(() => {
    async function fetchRoutine() {
      try {
        const res = await api.getScanHistory(1, 0);
        if (res.scans.length > 0) {
          const scanRes = await api.getScanDetail(res.scans[0].id);
          if (scanRes.routine) {
            setRoutine(scanRes.routine);
          }
        }
      } catch (err) {
        console.error('Failed to fetch routine:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoutine();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your routine...</p>
      </div>
    );
  }

  if (!routine || (routine.morning.length === 0 && routine.evening.length === 0)) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 flex flex-col items-center text-center mt-12">
        <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-primary-100">
          <ListChecks className="w-10 h-10 text-primary-500" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-3">No Routine Found</h2>
        <p className="text-gray-500 mb-8 max-w-md leading-relaxed">
          Run a skin analysis scan to generate a personalized morning and evening skincare routine tailored specifically to your skin type.
        </p>
        <button
          onClick={onStartScan}
          className="flex items-center gap-2 bg-primary-600 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-primary-700 transition-all shadow-sm hover:shadow active:scale-95"
        >
          Start New Scan
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 font-sans">
      <div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-gray-900">My Routine</h1>
        <p className="text-gray-500 text-sm mt-1">Your personalized daily skincare plan based on your latest scan.</p>
      </div>
      
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h3 className="text-lg font-display font-bold text-gray-900">Daily Routine</h3>
              <p className="text-xs text-gray-500 font-medium">Follow these steps daily for best results</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Morning Routine */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200 shadow-sm">
                  <Sun className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 font-display">Morning</h4>
              </div>
              <div className="space-y-4">
                {routine.morning.map((step: any, idx: number) => (
                  <div key={step.id || idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex gap-4 items-start transition-all hover:bg-white hover:shadow-md hover:border-gray-200 group">
                    <div className="w-8 h-8 bg-white border border-gray-200 text-gray-900 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-colors">
                      {step.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900">{step.product}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evening Routine */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200 shadow-sm">
                  <Moon className="w-5 h-5 text-indigo-500" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 font-display">Evening</h4>
              </div>
              <div className="space-y-4">
                {routine.evening.map((step: any, idx: number) => (
                  <div key={step.id || idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex gap-4 items-start transition-all hover:bg-white hover:shadow-md hover:border-gray-200 group">
                    <div className="w-8 h-8 bg-white border border-gray-200 text-gray-900 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-colors">
                      {step.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold text-gray-900">{step.product}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.action}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {routine.tips && routine.tips.length > 0 && (
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Expert Tips</span>
              </div>
              <ul className="space-y-3">
                {routine.tips.map((tip: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-3">
                    <span className="text-primary-500 mt-0.5 shrink-0">✦</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
