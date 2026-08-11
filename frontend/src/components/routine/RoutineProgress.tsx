import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface DayProgress {
  date: string;
  dayName: string;
  completed: boolean;
}

const RoutineProgress: React.FC = () => {
  const [progress, setProgress] = useState<DayProgress[]>([]);

  useEffect(() => {
    const today = new Date();
    const last7Days: DayProgress[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const saved = localStorage.getItem(`routine_log_${dateStr}`);
      const completedIds = saved ? JSON.parse(saved) : [];
      
      last7Days.push({
        date: dateStr,
        dayName,
        completed: completedIds.length > 0
      });
    }
    
    setProgress(last7Days);
  }, []);

  const streak = progress.filter(p => p.completed).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Weekly Progress</h2>
          <p className="text-sm text-gray-500">You're doing great!</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
          {streak} Day Streak
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        {progress.map((day) => (
          <div key={day.date} className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-gray-500">{day.dayName}</span>
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                day.completed 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'bg-gray-50 text-gray-300 border border-gray-200'
              }`}
            >
              {day.completed ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoutineProgress;
