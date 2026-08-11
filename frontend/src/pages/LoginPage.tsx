import { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { loginUser, registerUser, storeAuth, AuthUser } from '../services/auth';

interface LoginPageProps {
  open: boolean;
  initialMode?: 'login' | 'signup';
  onLogin: (user: AuthUser) => void;
  onClose: () => void;
}

export default function LoginPage({ open, initialMode = 'login', onLogin, onClose }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setIsLogin(initialMode === 'login');
      resetForm();
    }
  }, [open, initialMode]);

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
      if (!isLogin && password.length < 8) {
        setError('Password must be at least 8 characters.');
        setIsLoading(false);
        return;
      }

      let response;
      if (isLogin) {
        response = await loginUser(email.trim(), password);
        storeAuth(response.access_token, response.user);
        onLogin(response.user);
      } else {
        const registeredEmail = email.trim();
        await registerUser(name.trim(), registeredEmail, password);
        setIsLogin(true);
        setName('');
        setPassword('');
        setError('');
        setSuccess('');
        setShowPassword(false);
        setEmail(registeredEmail);
        setSuccess('Account created successfully. Please sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 t-overlay backdrop-blur-2xl"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative t-modal rounded-xl shadow-[0_12px_40px_-12px_rgb(0_0_0/0.15)] w-full max-w-md overflow-hidden t-reveal">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 t-text-secondary hover:t-text rounded-lg hover:t-bg-hover transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="mb-4">
            <span className="font-logo text-2xl font-bold tracking-tight text-gray-900">Skin<span className="text-primary-700">AI</span></span>
          </div>
          <h2 className="font-sans text-2xl font-bold tracking-tight t-text">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm t-text-secondary mt-2">
            {isLogin
              ? 'Sign in to access your dashboard'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="modal-name" className="block text-sm font-medium t-text-secondary mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted" />
                  <input
                    type="text"
                    id="modal-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="t-input pl-10"
                    placeholder="Your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="modal-email" className="block text-sm font-medium t-text-secondary mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted" />
                <input
                  type="email"
                  id="modal-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="t-input pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="modal-password" className="block text-sm font-medium t-text-secondary mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 t-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="modal-password"
                  required
                  minLength={isLogin ? undefined : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="t-input pl-10 pr-11"
                  placeholder={isLogin ? 'Enter your password' : 'Minimum 8 characters'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 t-text-muted hover:t-text-secondary transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 mt-2 rounded-lg bg-primary-700 hover:bg-primary-600 disabled:opacity-60 disabled:hover:bg-primary-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors active:translate-y-px"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 border-t t-divider"></div>
            <span className="text-xs t-text-muted">or</span>
            <div className="flex-1 border-t t-divider"></div>
          </div>

          <p className="t-text-secondary text-sm text-center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={handleToggle}
              className="font-semibold text-primary-700 hover:text-primary-600 transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
