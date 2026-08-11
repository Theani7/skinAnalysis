import { useState } from 'react';
import { ArrowLeft, User, Mail, Calendar, Loader2, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { AuthUser, updateProfile, storeAuth, getStoredToken } from '../services/auth';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ProfilePageProps {
  user: AuthUser | null;
  onBack: () => void;
  onUserUpdate: (user: AuthUser) => void;
  onLogout: () => void;
}

export default function ProfilePage({ user, onBack, onUserUpdate, onLogout }: ProfilePageProps) {
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 tracking-tight">SkinAI Profile</h1>
          <p className="text-sm text-gray-500">Manage your account settings</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-700 font-bold text-xl flex-shrink-0">
              {userInitials}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                Member since {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none"
                placeholder="Your full name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                id="profile-email"
                value={user.email}
                readOnly
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl text-sm cursor-not-allowed opacity-70"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 ml-1">Email cannot be changed</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || name.trim() === user.name}
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Account Actions Section */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Account Actions</h3>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to log in again to access your dashboard."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          setShowLogoutConfirm(false);
          onLogout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
