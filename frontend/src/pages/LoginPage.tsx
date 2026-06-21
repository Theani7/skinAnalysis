import { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle2, Camera } from 'lucide-react';
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
      } else {
        response = await registerUser(name.trim(), email.trim(), password);
      }

      storeAuth(response.access_token, response.user);
      onLogin(response.user);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-surface-400 hover:text-surface-900 rounded-full hover:bg-surface-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="w-12 h-12 bg-surface-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-display font-bold tracking-tight text-surface-900">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-surface-500 mt-2">
            {isLogin
              ? 'Sign in to access your dashboard'
              : 'Create an account to get started'}
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8">
          {error && (
            <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-success-600">{success}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="modal-name" className="block text-sm font-medium text-surface-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    id="modal-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900/10 focus:border-surface-300 transition-colors"
                    placeholder="Your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="modal-email" className="block text-sm font-medium text-surface-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="email"
                  id="modal-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-surface-200 rounded-xl text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900/10 focus:border-surface-300 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="modal-password" className="block text-sm font-medium text-surface-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="modal-password"
                  required
                  minLength={isLogin ? undefined : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 bg-white border border-surface-200 rounded-xl text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900/10 focus:border-surface-300 transition-colors"
                  placeholder={isLogin ? 'Enter your password' : 'Minimum 8 characters'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-surface-900 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-surface-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
            <div className="flex-1 h-px bg-surface-200"></div>
            <span className="text-xs text-surface-400">or</span>
            <div className="flex-1 h-px bg-surface-200"></div>
          </div>

          <p className="text-surface-500 text-sm text-center">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={handleToggle}
              className="font-medium text-surface-900 hover:underline underline-offset-4"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
