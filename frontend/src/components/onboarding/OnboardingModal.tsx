import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ArrowLeft, Droplets, Sun, Sparkles, Activity, ShieldCheck, HeartPulse, User, Calendar, Target, Palette } from 'lucide-react';
import api from '../../services/api';

interface OnboardingModalProps {
  userName: string;
  onComplete: (data: Record<string, any>) => void;
}

type Step = 'welcome' | 'sex' | 'age' | 'skin_type' | 'skin_tone' | 'primary_concern' | 'sensitivity' | 'complete';

export default function OnboardingModal({ userName, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    biologicalSex: '',
    ageGroup: '',
    skinType: '',
    skinTone: '',
    concerns: [] as string[],
    sensitivities: ''
  });

  const handleFinish = async () => {
    setLoading(true);
    try {
      const finalData = { ...profileData, onboarding_completed: true };
      
      await api.put('/auth/profile', {
        name: userName,
        profile_data: finalData
      });
      
      onComplete(finalData);
    } catch (err) {
      console.error('Failed to save onboarding data', err);
      onComplete({ ...profileData, onboarding_completed: true });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = (next: Step, delay = 150) => {
    setTimeout(() => setStep(next), delay);
  };

  const steps = {
    welcome: (
      <div className="text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-gradient-to-tr from-primary-50 to-primary-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-white">
          <Sparkles className="w-10 h-10 text-primary-500" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-3 tracking-tight">Welcome, {userName.split(' ')[0]}!</h2>
        <p className="text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed text-base">
          Let's create your unique skin profile. We'll use this to tailor our AI analysis and product recommendations exactly to your needs.
        </p>
        <button 
          onClick={() => setStep('sex')}
          className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white w-full py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary-200/50 flex items-center justify-center gap-2 hover:scale-[1.02]"
        >
          Start Profile Builder <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    ),
    sex: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><User className="w-5 h-5" /></div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Biological Sex</h2>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-12">Hormonal differences can affect skin thickness and sebum production.</p>
        
        <div className="space-y-3">
          {['Female', 'Male', 'Prefer not to say'].map((item) => (
            <button
              key={item}
              onClick={() => {
                setProfileData(prev => ({ ...prev, biologicalSex: item }));
                nextStep('age');
              }}
              className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50/30 transition-all font-medium text-gray-700 hover:text-primary-700 hover:shadow-md hover:shadow-primary-100/50"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    ),
    age: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><Calendar className="w-5 h-5" /></div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Age Group</h2>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-12">Collagen production and cellular turnover change over time.</p>
        
        <div className="grid grid-cols-2 gap-3">
          {['Under 20', '20-29', '30-39', '40-49', '50+'].map((item) => (
            <button
              key={item}
              onClick={() => {
                setProfileData(prev => ({ ...prev, ageGroup: item }));
                nextStep('skin_type');
              }}
              className={`w-full text-center p-5 rounded-2xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50/30 transition-all font-medium text-gray-700 hover:text-primary-700 hover:shadow-md hover:shadow-primary-100/50 ${item === '50+' ? 'col-span-2' : ''}`}
            >
              {item}
            </button>
          ))}
        </div>
        <button onClick={() => setStep('sex')} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    ),
    skin_type: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><Droplets className="w-5 h-5" /></div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Skin Type</h2>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-12">This dictates the product textures we recommend.</p>
        
        <div className="space-y-3">
          {[
            { id: 'Normal', label: 'Normal', desc: 'Well-balanced, rarely breaks out', icon: ShieldCheck },
            { id: 'Dry', label: 'Dry', desc: 'Feels tight, can be flaky or rough', icon: Sun },
            { id: 'Oily', label: 'Oily', desc: 'Shiny all over, prone to breakouts', icon: Droplets },
            { id: 'Combination', label: 'Combination', desc: 'Oily T-zone, dry or normal cheeks', icon: Activity },
            { id: 'Sensitive', label: 'Sensitive', desc: 'Prone to redness, stinging, or reactions', icon: HeartPulse }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, skinType: item.id }));
                nextStep('skin_tone');
              }}
              className="w-full text-left p-4 rounded-2xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50/30 transition-all group flex items-center gap-4 bg-white hover:shadow-md hover:shadow-primary-100/50"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-primary-100">
                <item.icon className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-lg">{item.label}</h4>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('age')} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    ),
    skin_tone: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><Palette className="w-5 h-5" /></div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Skin Tone</h2>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-12">Helps assess pigmentation and sun damage risks.</p>
        
        <div className="space-y-3">
          {[
            { id: 'I', label: 'Type I (Very Fair)', color: 'bg-[#f4d0b0]' },
            { id: 'II', label: 'Type II (Fair)', color: 'bg-[#eecbad]' },
            { id: 'III', label: 'Type III (Medium)', color: 'bg-[#e2b999]' },
            { id: 'IV', label: 'Type IV (Olive)', color: 'bg-[#c89a74]' },
            { id: 'V', label: 'Type V (Brown)', color: 'bg-[#8a5a44]' },
            { id: 'VI', label: 'Type VI (Dark)', color: 'bg-[#4a2e21]' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, skinTone: item.id }));
                nextStep('primary_concern');
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50/30 transition-all hover:shadow-md hover:shadow-primary-100/50"
            >
              <div className={`w-10 h-10 rounded-full shadow-inner border border-gray-200 ${item.color}`} />
              <span className="font-medium text-gray-700 text-lg">{item.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('skin_type')} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    ),
    primary_concern: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><Target className="w-5 h-5" /></div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Primary Goal</h2>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-12">We'll prioritize this in your tailored routine.</p>
        
        <div className="space-y-3">
          {[
            { id: 'Acne', label: 'Clearing Acne & Breakouts' },
            { id: 'Wrinkles/Fine Lines', label: 'Anti-aging & Fine Lines' },
            { id: 'Hyperpigmentation', label: 'Fading Dark Spots & Scars' },
            { id: 'Dullness', label: 'Improving Texture & Glow' },
            { id: 'Redness', label: 'Soothing Redness & Rosacea' },
            { id: 'Large Pores', label: 'Minimizing Large Pores' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, concerns: [item.id] }));
                nextStep('sensitivity');
              }}
              className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50/30 transition-all bg-white font-medium text-gray-700 hover:text-primary-700 text-lg hover:shadow-md hover:shadow-primary-100/50"
            >
              {item.label}
            </button>
          ))}
        </div>
        <button onClick={() => setStep('skin_tone')} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    ),
    sensitivity: (
      <div className="animate-in slide-in-from-right-8 fade-in duration-500">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><HeartPulse className="w-5 h-5" /></div>
          <h2 className="text-2xl font-display font-bold text-gray-900">Sensitivity</h2>
        </div>
        <p className="text-gray-500 text-sm mb-8 ml-12">Crucial for recommending the correct active ingredients.</p>
        
        <div className="space-y-3">
          {[
            { id: 'Not Sensitive', label: 'Not Sensitive', desc: 'Can handle strong actives like Retinol easily' },
            { id: 'Mildly Sensitive', label: 'Mildly Sensitive', desc: 'Occasional redness with new strong products' },
            { id: 'Very Sensitive', label: 'Very Sensitive', desc: 'Reacts to many products, gets red or itchy easily' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileData(prev => ({ ...prev, sensitivities: item.id }));
                nextStep('complete');
              }}
              className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 hover:border-primary-400 hover:bg-primary-50/30 transition-all bg-white hover:shadow-md hover:shadow-primary-100/50"
            >
              <h4 className="font-semibold text-gray-900 text-lg">{item.label}</h4>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
        <button onClick={() => setStep('primary_concern')} className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    ),
    complete: (
      <div className="text-center animate-in zoom-in-95 fade-in duration-500 py-6">
        <div className="w-24 h-24 bg-gradient-to-tr from-green-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-200">
          <ShieldCheck className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-display font-bold text-gray-900 mb-3 tracking-tight">You're All Set!</h2>
        <p className="text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed text-base">
          Your profile is perfectly calibrated. We'll use this data alongside your AI scans to curate a deeply personalized skincare journey.
        </p>
        <button 
          onClick={handleFinish}
          disabled={loading}
          className="bg-gray-900 hover:bg-gray-800 text-white w-full py-4 rounded-2xl font-semibold transition-all shadow-xl shadow-gray-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:scale-[1.02]"
        >
          {loading ? 'Finalizing Profile...' : 'Enter Dashboard'}
        </button>
      </div>
    )
  };

  const getProgressWidth = () => {
    switch (step) {
      case 'welcome': return '0%';
      case 'sex': return '16%';
      case 'age': return '32%';
      case 'skin_type': return '48%';
      case 'skin_tone': return '64%';
      case 'primary_concern': return '80%';
      case 'sensitivity': return '95%';
      case 'complete': return '100%';
      default: return '0%';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-10 w-full max-w-lg relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {step !== 'welcome' && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700 ease-out rounded-r-full"
              style={{ width: getProgressWidth() }}
            />
          </div>
        )}
        
        <div className="overflow-y-auto overflow-x-hidden flex-1 scrollbar-hide py-2">
          {steps[step]}
        </div>
      </div>
    </div>,
    document.body
  );
}
