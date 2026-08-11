import React, { useState, useEffect } from 'react';
import { Droplets, Moon, Wind, Plus, Minus } from 'lucide-react';

export default function LifestyleWidget() {
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(7.0);
  const [stress, setStress] = useState<'low' | 'med' | 'high'>('low');

  const today = new Date().toISOString().split('T')[0];
  const storageKey = `lifestyle_log_${today}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.water === 'number') setWater(parsed.water);
        if (typeof parsed.sleep === 'number') setSleep(parsed.sleep);
        if (['low', 'med', 'high'].includes(parsed.stress)) setStress(parsed.stress);
      } catch (e) {}
    }
  }, [storageKey]);

  const saveLog = (newWater: number, newSleep: number, newStress: 'low' | 'med' | 'high') => {
    localStorage.setItem(storageKey, JSON.stringify({ water: newWater, sleep: newSleep, stress: newStress }));
  };

  const updateWater = (delta: number) => {
    const newVal = Math.max(0, Math.min(10, water + delta));
    setWater(newVal);
    saveLog(newVal, sleep, stress);
  };

  const updateSleep = (delta: number) => {
    const newVal = Math.max(0, Math.min(14, parseFloat((sleep + delta).toFixed(1))));
    setSleep(newVal);
    saveLog(water, newVal, stress);
  };

  const updateStress = (level: 'low' | 'med' | 'high') => {
    setStress(level);
    saveLog(water, sleep, level);
  };

  // Calculate water progress percentage
  const waterProgress = Math.min(100, (water / 8) * 100);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-3xl shadow-sm p-6 h-full flex flex-col relative overflow-hidden">
      {/* Decorative blurred blob */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-50/50 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 bg-white shadow-sm border border-gray-100 rounded-2xl flex items-center justify-center">
          <Droplets className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">Daily Log</h3>
          <p className="text-xs text-gray-500 font-medium">Track wellness for better skin</p>
        </div>
      </div>

      <div className="space-y-6 mt-auto relative z-10">
        {/* Water Tracker with Visual Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Water</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 border border-primary-100">
                {water}/8
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => updateWater(-1)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <button onClick={() => updateWater(1)} className="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center text-white hover:bg-primary-600 transition-colors shadow-sm shadow-primary-500/20">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${waterProgress}%` }}
            >
              {waterProgress >= 100 && (
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>

        {/* Sleep Tracker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Sleep</span>
              <span className="text-xs font-bold text-primary-600">{sleep} hrs</span>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-1.5 flex items-center shadow-sm">
            <button onClick={() => updateSleep(-0.5)} className="flex-1 py-1.5 flex justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-100"></div>
            <div className="px-4 text-sm font-bold text-gray-800">{sleep}</div>
            <div className="w-px h-6 bg-gray-100"></div>
            <button onClick={() => updateSleep(0.5)} className="flex-1 py-1.5 flex justify-center text-primary-500 hover:bg-primary-50 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stress Level Toggle */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-gray-700">Stress Level</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'low', label: 'Low', color: 'bg-primary-50 text-primary-700 border-primary-200' },
              { id: 'med', label: 'Medium', color: 'bg-primary-50 text-primary-700 border-primary-200' },
              { id: 'high', label: 'High', color: 'bg-primary-50 text-primary-700 border-primary-200' }
            ].map((level) => (
              <button
                key={level.id}
                onClick={() => updateStress(level.id as any)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  stress === level.id 
                    ? `bg-primary-500 text-white border-transparent shadow-sm shadow-primary-500/20` 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
