import { useState } from 'react';
import { ArrowLeft, Activity, Loader2, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginUser, registerUser, storeAuth, AuthUser } from '../services/auth';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Client-side validation
      if (!email.trim()) {
        setError('Please enter your email address.');
        setIsLoading(false);
        return;
      }
      if (!password) {
        setError('Please enter your password.');
        setIsLoading(false);
        return;
      }
      if (!isLogin && !name.trim()) {
        setError('Please enter your full name.');
        setIsLoading(false);
        return;
      }
      if (!isLogin && password.length < 6) {
        setError('Password must be at least 6 characters.');
        setIsLoading(false);
        return;
      }

      let response;
      if (isLogin) {
        response = await loginUser(email.trim(), password);
      } else {
        response = await registerUser(name.trim(), email.trim(), password);
      }

      storeAuth(response.access_token, response.user);
      onLogin(response.user);
    } catch (err: any) {
      // Error is already formatted by the interceptor
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-surface-900 flex">
      {/* Visual Side (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-16 xl:p-20 flex-col justify-between text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl"></div>
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Activity className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <span className="text-2xl font-bold tracking-tighter">SkinAI.</span>
            <span className="block text-xs font-medium text-primary-200 -mt-1">Clinical Platform</span>
          </div>
        </div>

        <div className="z-10">
          <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            AI-Powered<br />Skin Analysis.
          </h2>
          <p className="text-primary-200 text-lg xl:text-xl max-w-md leading-relaxed">
            YOLOv8-based acne detection with personalized skincare recommendations.
          </p>
        </div>

        <div className="z-10 space-y-6">
          {/* Features */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'Real-time', label: 'Detection' },
              { value: 'Personalized', label: 'Routine' },
              { value: 'Clinical', label: 'Reports' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                <div className="text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-primary-200 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 md:p-12 xl:p-20 justify-center">
        <div className="max-w-md w-full mx-auto">
          {/* Back button */}
          <button
            onClick={onBack}
            className="mb-8 md:mb-10 flex items-center text-surface-500 hover:text-surface-900 font-bold transition-colors text-sm group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            Back to Home
          </button>

          {/* Header */}
          <div className="mb-8 md:mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-surface-500 font-medium text-sm md:text-base">
              {isLogin
                ? 'Sign in to access your clinical dashboard'
                : 'Join the AI-powered skin analysis platform'}
            </p>
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-medium text-danger-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-success-50 border border-success-500/20 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm font-medium text-success-600">{success}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name field (signup only) */}
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-surface-900 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" aria-hidden="true" />
                  <input
                    type="text"
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-surface-50 border-2 border-transparent focus:border-primary-600 focus:bg-white outline-none transition-all text-surface-900 text-sm placeholder:text-surface-400"
                    placeholder="Dr. Sarah Johnson"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-surface-900 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" aria-hidden="true" />
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-surface-50 border-2 border-transparent focus:border-primary-600 focus:bg-white outline-none transition-all text-surface-900 text-sm placeholder:text-surface-400"
                  placeholder="sarah@hospital.org"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-bold text-surface-900 uppercase tracking-widest">
                  Password
                </label>
                {isLogin && (
                  <button type="button" className="text-xs font-bold text-primary-600 hover:text-primary-800 transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  required
                  minLength={isLogin ? undefined : 6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-surface-50 border-2 border-transparent focus:border-primary-600 focus:bg-white outline-none transition-all text-surface-900 text-sm placeholder:text-surface-400"
                  placeholder={isLogin ? 'Enter your password' : 'Min. 6 characters'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary-600/20 hover:bg-primary-700 active:scale-[0.98] transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-surface-200"></div>
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-surface-200"></div>
          </div>

          {/* Toggle login/signup */}
          <p className="text-surface-500 font-medium text-sm text-center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={handleToggle}
              className="font-bold text-primary-600 hover:text-primary-800 transition-colors underline-offset-4 hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
