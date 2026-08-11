import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ArrowRight, Droplets, Sun, Sparkles, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import api from '../../services/api';

interface OnboardingModalProps {
  userName: string;
  onComplete: (data: Record<string, any>) => void;
}

type Step = 'welcome' | 'skin_type' | 'primary_concern' | 'sensitivity' | 'complete';

export default function OnboardingModal({ userName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    skinType: '',
    concern: '',
    sensitivity: ''
  });

  const handleFinish = async () => {
    setLoading(true);
    try {
      const finalData = { ...profileData, onboarding_completed: true };
      
      // Call update profile API
      const res = await api.put('/auth/profile', {
        name: userName, // Need to pass existing name
        profile_data: finalData
      });
      
      onComplete(finalData);
    } catch (err) {
      console.error('Failed to save onboarding data', err);
      // Even if it fails, let them pass for now
      onComplete({ ...profileData, onboarding_completed: true });
    } finally {
      setLoading(false);
    }
  };

  const steps = {
    welcome: (
      <div className="text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-primary-100">
          <Sparkles className="w-10 h-10 text-primary-500" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Welcome to SkinAI, {userName.split(' ')[0]}!</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
          Before we analyze your skin, let's personalize your experience. We need just a few details to give you the most accurate recommendations.
        </p>
        <button 
          onClick={() => setStep('skin_type')}
          className="bg-primary-600 hover:bg-primary-700 text-white w-full py-3.5 rounded-xl font-medium transition-all shadow-sm shadow-primary-200 flex items-center justify-center gap-2"
        >
          Let's Get Started <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    ),
    skin_type: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">What is your skin type?</h2>
        <p className="text-gray-500 text-sm mb-6">This helps us recommend the right product textures.</p>
        
        <div className="space-y-3">
          {[
            { id: 'oily', label: 'Oily', desc: 'Shiny all over, prone to breakouts', icon: Droplets },
            { id: 'dry', label: 'Dry', desc: 'Feels tight, can be flaky or rough', icon: Sun },
            { id: 'combination', label: 'Combination', desc: 'Oily T-zone, dry or normal cheeks', icon: Activity },
            { id: 'normal', label: 'Normal', desc: 'Well-balanced, rarely breaks out', icon: ShieldCheck }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, skinType: item.id }));
                setTimeout(() => setStep('primary_concern'), 150);
              }}
              className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50/50 transition-all group flex items-center gap-4 bg-white"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                <item.icon className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.label}</h4>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
            </button>
          ))}
        </div>
      </div>
    ),
    primary_concern: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">What is your main goal?</h2>
        <p className="text-gray-500 text-sm mb-6">We'll prioritize this in your routine.</p>
        
        <div className="space-y-3">
          {[
            { id: 'acne', label: 'Clearing Acne & Blemishes' },
            { id: 'anti-aging', label: 'Anti-aging & Fine Lines' },
            { id: 'pigmentation', label: 'Fading Dark Spots & Scars' },
            { id: 'texture', label: 'Improving Skin Texture & Glow' },
            { id: 'hydration', label: 'Deep Hydration & Barrier Repair' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, concern: item.id }));
                setTimeout(() => setStep('sensitivity'), 150);
              }}
              className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50/50 transition-all bg-white font-medium text-gray-700 hover:text-primary-700"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setStep('skin_type')}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium"
        >
          ← Back
        </button>
      </div>
    ),
    sensitivity: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <h2 className="text-xl font-display font-bold text-gray-900 mb-2">How sensitive is your skin?</h2>
        <p className="text-gray-500 text-sm mb-6">Important for recommending active ingredients.</p>
        
        <div className="space-y-3">
          {[
            { id: 'none', label: 'Not Sensitive', desc: 'Can handle strong actives easily' },
            { id: 'mild', label: 'Mildly Sensitive', desc: 'Occasional redness with new products' },
            { id: 'high', label: 'Very Sensitive', desc: 'Reacts to many products, gets red easily', icon: HeartPulse }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, sensitivity: item.id }));
                setTimeout(() => setStep('complete'), 150);
              }}
              className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50/50 transition-all bg-white"
            >
              <h4 className="font-semibold text-gray-900">{item.label}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>
        <button 
          onClick={() => setStep('primary_concern')}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 font-medium"
        >
          ← Back
        </button>
      </div>
    ),
    complete: (
      <div className="text-center animate-in zoom-in-95 fade-in duration-500">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
          <ShieldCheck className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">You're All Set!</h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
          Your profile is complete. We've updated our AI models to tailor recommendations specifically for your {profileData.skinType} skin.
        </p>
        <button 
          onClick={handleFinish}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white w-full py-3.5 rounded-xl font-medium transition-all shadow-sm shadow-primary-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {loading ? 'Saving Profile...' : 'Go to Dashboard'}
        </button>
      </div>
    )
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md relative overflow-hidden">
        {/* Progress Bar */}
        {step !== 'welcome' && step !== 'complete' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100">
            <div 
              className="h-full bg-primary-500 transition-all duration-500 ease-out"
              style={{ 
                width: step === 'skin_type' ? '33%' : step === 'primary_concern' ? '66%' : '90%' 
              }}
            />
          </div>
        )}
        
        {steps[step]}
      </div>
    </div>,
    document.body
  );
}
