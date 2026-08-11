import React, { useState, useEffect } from 'react';
import { Droplets, Moon, Plus, Minus } from 'lucide-react';

export default function LifestyleWidget() {
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(7.0);

  const today = new Date().toISOString().split('T')[0];
  const storageKey = `lifestyle_log_${today}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.water === 'number') setWater(parsed.water);
        if (typeof parsed.sleep === 'number') setSleep(parsed.sleep);
      } catch (e) {}
    }
  }, [storageKey]);

  const saveLog = (newWater: number, newSleep: number) => {
    localStorage.setItem(storageKey, JSON.stringify({ water: newWater, sleep: newSleep }));
  };

  const updateWater = (delta: number) => {
    const newVal = Math.max(0, Math.min(15, water + delta));
    setWater(newVal);
    saveLog(newVal, sleep);
  };

  const updateSleep = (delta: number) => {
    const newVal = Math.max(0, Math.min(14, parseFloat((sleep + delta).toFixed(1))));
    setSleep(newVal);
    saveLog(water, newVal);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <Droplets className="w-4 h-4 text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">Daily Lifestyle Log</h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-6">Track your habits to see how they affect your skin health over time.</p>

      <div className="space-y-6 mt-auto">
        {/* Water Tracker */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-3">
            <Droplets className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Water</p>
              <p className="text-[10px] text-gray-500">{water} / 8 glasses</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => updateWater(-1)} className="p-1 hover:bg-gray-50 rounded-md text-gray-400 hover:text-gray-700 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-4 text-center text-sm font-medium text-gray-700">{water}</span>
            <button onClick={() => updateWater(1)} className="p-1 hover:bg-gray-50 rounded-md text-gray-400 hover:text-blue-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sleep Tracker */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs font-semibold text-gray-700">Sleep</p>
              <p className="text-[10px] text-gray-500">{sleep} hrs</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5">
            <button onClick={() => updateSleep(-0.5)} className="p-1 hover:bg-gray-50 rounded-md text-gray-400 hover:text-gray-700 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center text-sm font-medium text-gray-700">{sleep}</span>
            <button onClick={() => updateSleep(0.5)} className="p-1 hover:bg-gray-50 rounded-md text-gray-400 hover:text-indigo-600 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
