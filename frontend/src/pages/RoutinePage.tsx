import React, { useState, useEffect } from 'react';
import { Clock, Sun, Moon, Lightbulb, ListChecks, ArrowRight, Loader2, Edit3, Settings, Save, Plus } from 'lucide-react';
import * as api from '../services/api';
import { getStoredUser } from '../services/auth';
import RoutineStepCard, { RoutineStep } from '../components/routine/RoutineStepCard';
import RoutineProgress from '../components/routine/RoutineProgress';
import RoutineReminders from '../components/routine/RoutineReminders';

interface RoutinePageProps {
  onStartScan: () => void;
}

export default function RoutinePage({ onStartScan }: RoutinePageProps) {
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState<{ morning: RoutineStep[], evening: RoutineStep[], tips: string[] } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  
  const user = getStoredUser();
  const userId = user?.id || 'anon';
  
  // Checklist State
  const todayKey = `${userId}_routine_log_${new Date().toISOString().split('T')[0]}`;
  const customRoutineKey = `${userId}_custom_routine`;
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    // Load checklist
    try {
      const savedChecks = localStorage.getItem(todayKey);
      if (savedChecks) setCompletedSteps(JSON.parse(savedChecks));
    } catch {}

    async function fetchRoutine() {
      try {
        // Check for custom routine first
        const customRoutineStr = localStorage.getItem(customRoutineKey);
        if (customRoutineStr) {
          setRoutine(JSON.parse(customRoutineStr));
          setLoading(false);
          return;
        }

        // Otherwise fetch latest scan
        const res = await api.getScanHistory(1, 0);
        if (res.scans.length > 0) {
          const scanRes = await api.getScanDetail(res.scans[0].id);
          if (scanRes.routine) {
            // Ensure IDs exist
            const r = scanRes.routine;
            const addId = (step: any, prefix: string, idx: number) => ({
              ...step,
              id: step.id || `${prefix}-${idx}-${Date.now()}`,
              step: step.step || idx + 1
            });
            const formattedRoutine = {
              morning: r.morning.map((s: any, i: number) => addId(s, 'm', i)),
              evening: r.evening.map((s: any, i: number) => addId(s, 'e', i)),
              tips: r.tips || []
            };
            setRoutine(formattedRoutine);
          }
        }
      } catch (err) {
        console.error('Failed to fetch routine:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRoutine();
  }, [todayKey]);

  const toggleStep = (stepId: string) => {
    if (isEditMode) return;
    setCompletedSteps(prev => {
      const next = prev.includes(stepId) ? prev.filter(id => id !== stepId) : [...prev, stepId];
      localStorage.setItem(todayKey, JSON.stringify(next));
      return next;
    });
  };

  const saveCustomRoutine = () => {
    localStorage.setItem(customRoutineKey, JSON.stringify(routine));
    setIsEditMode(false);
  };

  const handleUpdateStep = (type: 'morning' | 'evening', index: number, updated: RoutineStep) => {
    if (!routine) return;
    const newRoutine = { ...routine };
    newRoutine[type][index] = updated;
    setRoutine(newRoutine);
  };

  const handleDeleteStep = (type: 'morning' | 'evening', index: number) => {
    if (!routine) return;
    const newRoutine = { ...routine };
    newRoutine[type].splice(index, 1);
    // Re-index steps
    newRoutine[type] = newRoutine[type].map((s, i) => ({ ...s, step: i + 1 }));
    setRoutine(newRoutine);
  };

  const handleAddStep = (type: 'morning' | 'evening') => {
    if (!routine) return;
    const newRoutine = { ...routine };
    newRoutine[type].push({
      id: `${type}-${Date.now()}`,
      step: newRoutine[type].length + 1,
      product: 'New Product',
      action: 'How to apply...'
    });
    setRoutine(newRoutine);
  };

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
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col items-center text-center mt-12">
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
    <div className="w-full space-y-8 animate-in fade-in duration-500 font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-gray-900">My Routine</h1>
          <p className="text-gray-500 text-sm mt-1">Check off your daily steps and build a healthy habit.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReminders(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
          >
            <Settings className="w-4 h-4" />
            Reminders
          </button>
          
          {isEditMode ? (
            <button
              onClick={saveCustomRoutine}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm text-sm"
            >
              <Save className="w-4 h-4" />
              Save Routine
            </button>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Customize
            </button>
          )}
        </div>
      </div>
      
      {/* Progress Graph */}
      {!isEditMode && <RoutineProgress />}

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-gray-900">
                  {isEditMode ? 'Editing Routine' : 'Daily Routine'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {isEditMode ? 'Drag to reorder or edit steps below' : 'Tap a step to mark it complete'}
                </p>
              </div>
            </div>
            
            {/* Quick reset/clear custom */}
            {isEditMode && localStorage.getItem(customRoutineKey) && (
              <button
                onClick={() => {
                  localStorage.removeItem(customRoutineKey);
                  window.location.reload();
                }}
                className="text-xs text-red-500 hover:text-red-700 underline font-medium"
              >
                Reset to Original
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {/* Morning Routine */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200 shadow-sm">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 font-display">Morning</h4>
                </div>
                {isEditMode && (
                  <button onClick={() => handleAddStep('morning')} className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-primary-100 transition-colors">
                    <Plus className="w-3 h-3" /> Add Step
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {routine.morning.map((step, idx) => (
                  <RoutineStepCard 
                    key={step.id || `m-${idx}`}
                    step={step}
                    isCompleted={completedSteps.includes(step.id || `m-${idx}`)}
                    onToggle={() => toggleStep(step.id || `m-${idx}`)}
                    isEditMode={isEditMode}
                    onUpdate={(updated) => handleUpdateStep('morning', idx, updated)}
                    onDelete={() => handleDeleteStep('morning', idx)}
                  />
                ))}
                {routine.morning.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-4">No morning steps.</p>
                )}
              </div>
            </div>

            {/* Evening Routine */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200 shadow-sm">
                    <Moon className="w-5 h-5 text-indigo-500" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 font-display">Evening</h4>
                </div>
                {isEditMode && (
                  <button onClick={() => handleAddStep('evening')} className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-primary-100 transition-colors">
                    <Plus className="w-3 h-3" /> Add Step
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {routine.evening.map((step, idx) => (
                  <RoutineStepCard 
                    key={step.id || `e-${idx}`}
                    step={step}
                    isCompleted={completedSteps.includes(step.id || `e-${idx}`)}
                    onToggle={() => toggleStep(step.id || `e-${idx}`)}
                    isEditMode={isEditMode}
                    onUpdate={(updated) => handleUpdateStep('evening', idx, updated)}
                    onDelete={() => handleDeleteStep('evening', idx)}
                  />
                ))}
                {routine.evening.length === 0 && (
                  <p className="text-sm text-gray-400 italic py-4">No evening steps.</p>
                )}
              </div>
            </div>
          </div>

          {routine.tips && routine.tips.length > 0 && !isEditMode && (
            <div className="mt-8 p-6 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-100/50 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Expert Tips</span>
              </div>
              <ul className="space-y-3">
                {routine.tips.map((tip: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-3">
                    <span className="text-amber-400 mt-0.5 shrink-0">✦</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {showReminders && (
        <RoutineReminders onClose={() => setShowReminders(false)} />
      )}
    </div>
  );
}
