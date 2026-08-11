import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Loader2, Sparkles } from 'lucide-react';
import { AuthUser, updateProfile } from '../services/auth';

interface OnboardingModalProps {
  user: AuthUser;
  onComplete: (user: AuthUser) => void;
  onSkip: () => void;
}

const BIOLOGICAL_SEX = ['Female', 'Male', 'Prefer not to say'];
const AGE_GROUPS = ['Under 20', '20-29', '30-39', '40-49', '50+'];
const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
const FITZPATRICK_TONES = [
  { id: 'I', label: 'Type I (Very Fair)' },
  { id: 'II', label: 'Type II (Fair)' },
  { id: 'III', label: 'Type III (Medium)' },
  { id: 'IV', label: 'Type IV (Olive)' },
  { id: 'V', label: 'Type V (Brown)' },
  { id: 'VI', label: 'Type VI (Dark)' },
];
const SKIN_CONCERNS = ['Acne', 'Hyperpigmentation', 'Wrinkles/Fine Lines', 'Redness', 'Large Pores', 'Dullness', 'Dark Circles'];
const ROUTINE_COMPLEXITIES = ['Minimal (2-3 steps)', 'Moderate (4-5 steps)', 'Extensive (6+ steps)'];

export default function OnboardingModal({ user, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [biologicalSex, setBiologicalSex] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [skinType, setSkinType] = useState('');
  const [skinTone, setSkinTone] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [routine, setRoutine] = useState('');

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const toggleConcern = (c: string) => {
    if (concerns.includes(c)) {
      setConcerns(concerns.filter(x => x !== c));
    } else if (concerns.length < 3) {
      setConcerns([...concerns, c]);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const newProfileData = {
        biologicalSex,
        ageGroup,
        skinType,
        skinTone,
        concerns,
        routine,
        sensitivities: ''
      };
      const updatedUser = await updateProfile(user.name, newProfileData);
      onComplete(updatedUser);
    } catch (err) {
      console.error(err);
      // In a real app, handle error visibly
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return biologicalSex !== '';
    if (step === 2) return ageGroup !== '';
    if (step === 3) return skinType !== '';
    if (step === 4) return skinTone !== '';
    if (step === 5) return concerns.length > 0;
    if (step === 6) return routine !== '';
    return true;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onSkip} aria-hidden="true" />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-gray-100">
          <div 
            className="h-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 z-10 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip
        </button>

        {/* Content */}
        <div className="p-8 sm:p-10 min-h-[400px] flex flex-col">
          
          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Welcome, {user.name.split(' ')[0]}!</h2>
                <p className="text-gray-500">Let's personalize your SkinAI experience. First, what is your biological sex?</p>
                <div className="mt-8 space-y-3">
                  {BIOLOGICAL_SEX.map(option => (
                    <button
                      key={option}
                      onClick={() => { setBiologicalSex(option); setTimeout(handleNext, 300); }}
                      className={`w-full p-4 rounded-2xl border-2 text-left font-medium transition-all ${biologicalSex === option ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">What is your age group?</h2>
                <p className="text-gray-500">Age affects skin elasticity and collagen production.</p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {AGE_GROUPS.map(option => (
                    <button
                      key={option}
                      onClick={() => { setAgeGroup(option); setTimeout(handleNext, 300); }}
                      className={`p-4 rounded-2xl border-2 text-center font-medium transition-all ${ageGroup === option ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">What is your skin type?</h2>
                <p className="text-gray-500">This helps us recommend the right ingredients for your barrier.</p>
                <div className="mt-8 space-y-3">
                  {SKIN_TYPES.map(option => (
                    <button
                      key={option}
                      onClick={() => { setSkinType(option); setTimeout(handleNext, 300); }}
                      className={`w-full p-4 rounded-2xl border-2 text-left font-medium transition-all flex items-center justify-between ${skinType === option ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {option}
                      {skinType === option && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Your skin tone?</h2>
                <p className="text-gray-500">How does your skin react to the sun?</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FITZPATRICK_TONES.map(option => (
                    <button
                      key={option.id}
                      onClick={() => { setSkinTone(option.id); setTimeout(handleNext, 300); }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${skinTone === option.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      <div className="font-bold mb-1">{option.id}</div>
                      <div className="text-xs opacity-80">{option.label.split('(')[1].replace(')', '')}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Primary Concerns</h2>
                <p className="text-gray-500">Select up to 3 things you'd like to improve.</p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {SKIN_CONCERNS.map(option => {
                    const isSelected = concerns.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggleConcern(option)}
                        className={`px-4 py-2.5 rounded-full border-2 font-medium transition-all ${isSelected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-primary-200 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Routine Complexity</h2>
                <p className="text-gray-500">How much time do you spend on skincare daily?</p>
                <div className="mt-8 space-y-3">
                  {ROUTINE_COMPLEXITIES.map(option => (
                    <button
                      key={option}
                      onClick={() => { setRoutine(option); }}
                      className={`w-full p-4 rounded-2xl border-2 text-left font-medium transition-all ${routine === option ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-100 hover:border-primary-200 hover:bg-gray-50 text-gray-700'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer Controls */}
          <div className="mt-auto pt-6 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            ) : (
              <div></div>
            )}
            
            <button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-primary-500/30"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {step === totalSteps ? 'Finish' : 'Next'}
                  {step !== totalSteps && <ChevronRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
