import { useState } from 'react';
import { ArrowLeft, User, Mail, Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthUser, updateProfile, storeAuth, getStoredToken } from '../services/auth';

interface ProfilePageProps {
  user: AuthUser | null;
  onBack: () => void;
  onUserUpdate: (user: AuthUser) => void;
}

export default function ProfilePage({ user, onBack, onUserUpdate }: ProfilePageProps) {
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!user) return null;

  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    if (name.trim() === user.name) {
      setSuccess('Profile is already up to date.');
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = await updateProfile(name.trim());
      const token = getStoredToken();
      if (token) {
        storeAuth(token, updatedUser);
      }
      onUserUpdate(updatedUser);
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-surface-400 hover:text-surface-700 rounded-lg hover:bg-surface-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight">Profile</h1>
          <p className="text-sm text-surface-500">Manage your account settings</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
        {/* Avatar Section */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-surface-100">
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary-700 font-black text-xl sm:text-2xl flex-shrink-0">
              {userInitials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-900">{user.name}</h2>
              <p className="text-sm text-surface-500">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-surface-400">
                <Calendar className="w-3 h-3" />
                Member since {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Messages */}
          {error && (
            <div className="p-3 bg-danger-50 border border-danger-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-danger-500 flex-shrink-0" />
              <p className="text-sm font-medium text-danger-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-success-50 border border-success-500/20 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-success-500 flex-shrink-0" />
              <p className="text-sm font-medium text-success-600">{success}</p>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label htmlFor="profile-name" className="block text-xs font-bold text-surface-900 uppercase tracking-widest mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-5 py-3 rounded-xl bg-surface-50 border-2 border-transparent focus:border-primary-600 focus:bg-white outline-none transition-all text-surface-900 text-sm"
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label htmlFor="profile-email" className="block text-xs font-bold text-surface-900 uppercase tracking-widest mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="email"
                id="profile-email"
                value={user.email}
                readOnly
                className="w-full pl-11 pr-5 py-3 rounded-xl bg-surface-100 border-2 border-transparent text-surface-500 text-sm cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-surface-400 mt-1.5 ml-1">Email cannot be changed</p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || name.trim() === user.name}
              className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
