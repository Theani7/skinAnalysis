import { useState } from 'react';
import { ArrowLeft, Activity, Globe } from 'lucide-react';

export default function LoginPage({ onLogin, onBack }: { onLogin: () => void, onBack: () => void }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-white text-[#0F172A] flex">
      {/* Visual Side (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-[#1E3A8A] p-20 flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        </div>
        
        <div className="z-10 flex items-center gap-2">
          <Activity className="w-8 h-8 text-blue-300" />
          <span className="text-2xl font-bold tracking-tighter">SkinAI.</span>
        </div>

        <div className="z-10">
          <h2 className="text-5xl font-extrabold tracking-tight mb-6">Revolutionizing <br/>Digital Dermatology.</h2>
          <p className="text-blue-100 text-xl max-w-md leading-relaxed">Join over 10,000 clinicians and individuals using AI to track skin health.</p>
        </div>

        <div className="z-10 flex items-center gap-6">
          <div className="flex -space-x-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full bg-blue-400 border-2 border-[#1E3A8A]"></div>
            ))}
          </div>
          <p className="text-sm font-bold text-blue-200">Trusted by medical professionals worldwide.</p>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 md:p-24 justify-center">
        <div className="max-w-md w-full mx-auto">
          <button onClick={onBack} className="mb-12 flex items-center text-[#64748B] hover:text-[#0F172A] font-bold transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Home
          </button>

          <h2 className="text-4xl font-extrabold tracking-tight mb-2">{isLogin ? 'Sign In' : 'Create Clinical Account'}</h2>
          <p className="text-[#64748B] font-medium mb-10">Enter your credentials to access the IoT dashboard.</p>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-2">Full Name</label>
                <input type="text" required className="w-full px-6 py-4 rounded-2xl bg-[#F8FAFC] border-none focus:ring-2 focus:ring-[#1E3A8A] outline-none transition-all text-[#0F172A]" placeholder="Dr. Sarah Johnson" />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-2">Email Address</label>
              <input type="email" required className="w-full px-6 py-4 rounded-2xl bg-[#F8FAFC] border-none focus:ring-2 focus:ring-[#1E3A8A] outline-none transition-all text-[#0F172A]" placeholder="sarah@hospital.org" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-widest">Password</label>
                {isLogin && <a href="#" className="text-xs font-bold text-[#1E3A8A]">Forgot Password?</a>}
              </div>
              <input type="password" required className="w-full px-6 py-4 rounded-2xl bg-[#F8FAFC] border-none focus:ring-2 focus:ring-[#1E3A8A] outline-none transition-all text-[#0F172A]" placeholder="••••••••" />
            </div>

            <button type="submit" className="w-full bg-[#1E3A8A] text-white py-5 rounded-2xl font-bold shadow-xl shadow-blue-900/10 hover:bg-[#112D75] transition-all text-lg">
              {isLogin ? 'Sign In to Dashboard' : 'Create Account'}
            </button>
          </form>

          <div className="mt-10 pt-10 border-t border-gray-100 text-center">
            <p className="text-[#64748B] font-medium">
              {isLogin ? "New to SkinAI? " : "Already have an account? "}
              <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-[#1E3A8A] hover:underline transition-all underline-offset-4">{isLogin ? 'Sign Up' : 'Log In'}</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
