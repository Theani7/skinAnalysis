import { useState } from 'react';
import { ArrowLeft, User, Mail, Calendar, Loader2, CheckCircle2, AlertCircle, LogOut, ChevronDown, Info, Shield, Key, Trash2 } from 'lucide-react';
import { AuthUser, updateProfile, storeAuth, getStoredToken, changePassword, deleteAccount } from '../services/auth';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ProfilePageProps {
  user: AuthUser | null;
  onBack: () => void;
  onUserUpdate: (user: AuthUser) => void;
  onLogout: () => void;
}

const BIOLOGICAL_SEX = ['Female', 'Male', 'Prefer not to say'];
const SKIN_TYPES = ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'];
const AGE_GROUPS = ['Under 20', '20-29', '30-39', '40-49', '50+'];
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

export default function ProfilePage({ user, onBack, onUserUpdate, onLogout }: ProfilePageProps) {
  const [name, setName] = useState(user?.name || '');
  
  // Personalization states
  const profileData = user?.profile_data || {};
  const [biologicalSex, setBiologicalSex] = useState(profileData.biologicalSex || '');
  const [ageGroup, setAgeGroup] = useState(profileData.ageGroup || '');
  
  const [skinType, setSkinType] = useState(profileData.skinType || '');
  const [skinTone, setSkinTone] = useState(profileData.skinTone || '');
  
  const [concerns, setConcerns] = useState<string[]>(profileData.concerns || []);
  const [routine, setRoutine] = useState(profileData.routine || '');
  const [sensitivities, setSensitivities] = useState(profileData.sensitivities || '');

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Security Tab States
  const [activeTab, setActiveTab] = useState<'personalization' | 'security'>('personalization');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const toggleConcern = (c: string) => {
    if (concerns.includes(c)) {
      setConcerns(concerns.filter(x => x !== c));
    } else if (concerns.length < 3) {
      setConcerns([...concerns, c]);
    } else {
      setError('You can select a maximum of 3 primary concerns.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    const newProfileData = {
      biologicalSex,
      ageGroup,
      skinType,
      skinTone,
      concerns,
      routine,
      sensitivities
    };

    setIsLoading(true);
    try {
      const updatedUser = await updateProfile(name.trim(), newProfileData);
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
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
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
            <p className="text-sm text-gray-500">Manage your account and personalization settings</p>
          </div>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2.5 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Avatar Section */}
        <div className="p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center text-primary-700 font-bold text-2xl flex-shrink-0 shadow-inner">
              {userInitials}
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-500">{user.email}</p>
              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-400 font-medium">
                <Calendar className="w-4 h-4" />
                Member since {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8 gap-8">
          <button
            onClick={() => setActiveTab('personalization')}
            className={`py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'personalization' 
                ? 'border-primary-500 text-primary-700' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Personalization
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'security' 
                ? 'border-primary-500 text-primary-700' 
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>

        {activeTab === 'personalization' ? (
          <form onSubmit={handleSubmit} className="p-8 animate-in fade-in duration-300">
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-700">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-12">
            
            {/* Left Column */}
            <div className="space-y-10">
              
              {/* Group 1: Basic Information */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-display font-bold text-gray-900 mb-1">Account Details</h3>
                  <p className="text-sm text-gray-500 mb-5">Your basic login information.</p>
                </div>
                
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
              </div>

              <hr className="border-gray-100" />

              {/* Group 2: Demographics */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-display font-bold text-gray-900 mb-1">Demographics</h3>
                  <p className="text-sm text-gray-500 mb-5">Hormones and age greatly influence skin behavior.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Biological Sex</label>
                    <div className="relative">
                      <select
                        value={biologicalSex}
                        onChange={(e) => setBiologicalSex(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">Select</option>
                        {BIOLOGICAL_SEX.map(bs => <option key={bs} value={bs}>{bs}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Age Group</label>
                    <div className="relative">
                      <select
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">Select</option>
                        {AGE_GROUPS.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-10">
              
              {/* Group 3: Skin Characteristics */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-display font-bold text-gray-900 mb-1">Skin Characteristics</h3>
                  <p className="text-sm text-gray-500 mb-5">Determines how your skin reacts to products and environment.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                      Skin Type
                      <a 
                        href="https://www.healthline.com/health/beauty-skin-care/skin-type-test" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:text-primary-600 transition-colors"
                        title="How to find your skin type"
                      >
                        <Info className="w-4 h-4" />
                      </a>
                    </label>
                    <div className="relative">
                      <select
                        value={skinType}
                        onChange={(e) => setSkinType(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">Select</option>
                        {SKIN_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                      Skin Tone
                      <a 
                        href="https://www.healthline.com/health/beauty-skin-care/fitzpatrick-skin-types" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:text-primary-600 transition-colors"
                        title="How to find your Fitzpatrick type"
                      >
                        <Info className="w-4 h-4" />
                      </a>
                    </label>
                    <div className="relative">
                      <select
                        value={skinTone}
                        onChange={(e) => setSkinTone(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">Select</option>
                        {FITZPATRICK_TONES.map(ft => <option key={ft.id} value={ft.id}>{ft.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Group 4: Concerns & Routine */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-lg font-display font-bold text-gray-900 mb-1">Goals & Habits</h3>
                  <p className="text-sm text-gray-500 mb-5">Helps us curate the perfect recommendations for you.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Concerns <span className="text-gray-400 font-normal">(Max 3)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_CONCERNS.map(c => {
                      const isSelected = concerns.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleConcern(c)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            isSelected 
                              ? 'bg-primary-50 text-primary-700 border-primary-200 shadow-sm shadow-primary-500/10' 
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Routine Complexity</label>
                    <div className="relative">
                      <select
                        value={routine}
                        onChange={(e) => setRoutine(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none appearance-none"
                      >
                        <option value="">Select</option>
                        {ROUTINE_COMPLEXITIES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Known Sensitivities</label>
                    <input
                      type="text"
                      value={sensitivities}
                      onChange={(e) => setSensitivities(e.target.value)}
                      placeholder="e.g. Fragrance, Retinol"
                      className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white px-10 py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm shadow-primary-500/30 hover:shadow-md hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
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
        ) : (
          <div className="p-8 space-y-12 animate-in fade-in duration-300">
            {/* Change Password */}
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-display font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-gray-400" /> Change Password
                </h3>
                <p className="text-sm text-gray-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
              </div>

              {passwordError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 max-w-md">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-700">{passwordError}</p>
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 max-w-md">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-700">{passwordSuccess}</p>
                </div>
              )}

              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordError('');
                  setPasswordSuccess('');
                  if (newPassword.length < 8) {
                    setPasswordError('New password must be at least 8 characters.');
                    return;
                  }
                  setIsChangingPassword(true);
                  try {
                    await changePassword(currentPassword, newPassword);
                    setPasswordSuccess('Password updated successfully.');
                    setCurrentPassword('');
                    setNewPassword('');
                  } catch (err: any) {
                    setPasswordError(err.message || 'Failed to update password.');
                  } finally {
                    setIsChangingPassword(false);
                  }
                }} 
                className="max-w-md space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm outline-none"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 rounded-xl text-sm outline-none"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isChangingPassword || !currentPassword || !newPassword}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </form>
            </div>

            <hr className="border-gray-100" />

            {/* Delete Account */}
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-display font-bold text-red-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-sm text-gray-500 mt-1">Once you delete your account, there is no going back. All your data and scan history will be permanently deleted.</p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-6 py-2.5 rounded-xl font-medium text-sm transition-colors border border-red-100"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your account? This action cannot be undone and all your scan data will be permanently erased."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Account'}
        cancelLabel="Cancel"
        danger
        onConfirm={async () => {
          if (isDeleting) return;
          setIsDeleting(true);
          try {
            await deleteAccount();
            setShowDeleteConfirm(false);
            onLogout();
          } catch (err: any) {
            alert(err.message || 'Failed to delete account.');
            setShowDeleteConfirm(false);
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
