import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Scan, Brain, FileText, Check } from 'lucide-react';

interface AnalysisLoadingPageProps { imageUrl: string; onComplete: () => void; }

const steps = [
  { id: 1, label: 'Uploading image', icon: Upload, duration: 1500 },
  { id: 2, label: 'Face detection', icon: Scan, duration: 2000 },
  { id: 3, label: 'AI analysis', icon: Brain, duration: 2500 },
  { id: 4, label: 'Generating report', icon: FileText, duration: 1500 },
];

export function AnalysisLoadingPage({ imageUrl, onComplete }: AnalysisLoadingPageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (currentStep < steps.length) {
      t = setTimeout(() => { setCompletedSteps((p) => [...p, currentStep]); setCurrentStep((p) => p + 1); }, steps[currentStep].duration);
    } else { t = setTimeout(onComplete, 400); }
    return () => clearTimeout(t);
  }, [currentStep, onComplete]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 flex justify-center">
          <div className="relative w-24 h-24">
            <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.03, 0.1] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute inset-0 rounded-full bg-emerald-600" />
            <div className="absolute inset-1.5 rounded-full overflow-hidden border-2 border-dark-700 shadow-xl">
              {imageUrl ? <img src={imageUrl} alt="Analyzing" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-dark-800 flex items-center justify-center"><Brain className="w-8 h-8 text-gray-500" /></div>}
            </div>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} className="absolute inset-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-600" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-1">Analyzing</h2>
          <p className="text-gray-400">Processing your image</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-dark-800 border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col gap-3">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isActive = currentStep === index;
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isCompleted ? 'bg-emerald-500 text-white' : isActive ? 'bg-emerald-600 text-white' : 'bg-dark-900 text-gray-600'}`}>
                      <AnimatePresence mode="wait">{isCompleted ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-4 h-4" /></motion.div> : <Icon className="w-4 h-4" />}</AnimatePresence>
                    </div>
                    <span className={`text-sm ${isCompleted || isActive ? 'text-emerald-500 font-semibold' : 'text-gray-500 font-normal'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium">Progress</span>
                <span className="text-xs font-semibold text-emerald-500">{Math.round((completedSteps.length / steps.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
                <motion.div animate={{ width: `${(completedSteps.length / steps.length) * 100}%` }} transition={{ duration: 0.4 }} className="h-full bg-emerald-600 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
