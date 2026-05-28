import React, { useState } from 'react';
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Lock, Eye, EyeOff, X, Key, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const user = auth.currentUser;
  // Check if they signed in using password provider
  const isPasswordUser = user ? user.providerData.some(p => p.providerId === 'password') : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!user) {
      setError('You must be logged in to change your password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      if (user.email) {
        // Reauthenticate the user first
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, newPassword);
        
        setSuccessMsg('Your password has been securely updated!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error('User email not found.');
      }
    } catch (err: any) {
      console.error('Password change error:', err);
      // Simplify Firebase error messages for standard users
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('The current password you entered is incorrect.');
      } else if (err.code === 'auth/weak-password') {
        setError('The new password is too weak. Please choose a stronger one.');
      } else {
        setError(err.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="change_password_modal_overlay"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="change_password_modal_container"
        className="fancy-card max-w-md w-full border-t-4 border-t-blue-500 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gold faction-gold" />
            <h3 className="text-lg font-serif font-bold text-white tracking-wide">Keymaster Settings</h3>
          </div>
          <button 
            id="change_password_close_btn"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isPasswordUser ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-slate-300 text-sm leading-relaxed">
              <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white mb-1">Google Credentials Detected</p>
                <p>Your adventurer passport is currently linked directly with your Google account. Password updates are managed secure-side via Google Account settings.</p>
              </div>
            </div>
            <button 
              id="change_password_dismiss_btn"
              onClick={onClose}
              className="fancy-button w-full mt-2"
            >
              Acknowledge
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              Verify your current credentials to cast the update spell and secure your Norrath ledger.
            </p>

            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gold/80 flex items-center gap-1.5 font-sans uppercase">
                <Lock className="w-3.5 h-3.5" /> Current Password
              </label>
              <div className="relative">
                <input
                  id="current_password_input"
                  type={showCurrent ? 'text' : 'password'}
                  required
                  className="fancy-input w-full pr-10 text-sm"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  id="toggle_current_pw_btn"
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gold/80 flex items-center gap-1.5 font-sans uppercase">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> New Password
              </label>
              <div className="relative">
                <input
                  id="new_password_input"
                  type={showNew ? 'text' : 'password'}
                  required
                  className="fancy-input w-full pr-10 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  id="toggle_new_pw_btn"
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gold/80 flex items-center gap-1.5 font-sans uppercase">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm_password_input"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  className="fancy-input w-full pr-10 text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  id="toggle_confirm_pw_btn"
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20 flex gap-2 items-start font-sans">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="text-emerald-400 text-xs bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20 flex gap-2 items-start font-sans animate-pulse">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Action Button */}
            <button
              id="change_password_submit_btn"
              type="submit"
              disabled={loading}
              className="fancy-button w-full mt-2 flex items-center justify-center gap-2"
            >
              {loading ? 'Recasting Spell...' : 'Secure Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
