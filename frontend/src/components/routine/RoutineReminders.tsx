import React, { useState, useEffect } from 'react';
import { Clock, Save, BellRing, X } from 'lucide-react';

interface ReminderSettings {
  morning: string;
  evening: string;
  enabled: boolean;
}

interface RoutineRemindersProps {
  onClose: () => void;
}

const RoutineReminders: React.FC<RoutineRemindersProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<ReminderSettings>({
    morning: '08:00',
    evening: '21:00',
    enabled: true
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('routine_reminders');
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse reminders", e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('routine_reminders', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Routine Reminders</h2>
              <p className="text-sm text-gray-500">Set times for your skincare</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={settings.enabled}
            onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className={`space-y-4 transition-opacity ${settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Morning Routine</span>
          </div>
          <input
            type="time"
            value={settings.morning}
            onChange={(e) => setSettings({...settings, morning: e.target.value})}
            className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 outline-none transition-all"
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Evening Routine</span>
          </div>
          <input
            type="time"
            value={settings.evening}
            onChange={(e) => setSettings({...settings, evening: e.target.value})}
            className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 outline-none transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          className={`w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium transition-all ${
            saved 
              ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm shadow-green-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
          }`}
        >
          {saved ? (
            <>Saved Successfully!</>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoutineReminders;
