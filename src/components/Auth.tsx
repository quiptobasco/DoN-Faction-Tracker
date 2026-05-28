import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Swords, Mail, Lock, ShieldCheck, ArrowLeft, Key } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Initialize user profile with friend code
        const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          friendCode,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSent(false);
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No adventurer was found with this email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to send reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists, if not create
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 scroll-bg">
      <div className="fancy-card max-w-md w-full p-8 space-y-8 border-t-4 border-t-blue-500 shadow-2xl">
        
        {isForgotPassword ? (
          /* Password Reset View */
          <div className="space-y-6">
            <div className="text-center">
              <Key className="w-16 h-16 text-gold mx-auto mb-4 faction-gold" />
              <h2 className="text-3xl font-serif font-bold faction-gold tracking-tight">Recover Passport</h2>
              <p className="text-slate-400 mt-2 font-sans text-sm">We'll dispatch a secure mentalist-link to reconstruct your key</p>
            </div>

            {resetSent ? (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center text-slate-300 text-sm">
                  <p className="font-bold text-emerald-400 mb-1">Scroll dispatched successfully!</p>
                  <p>Check your owl post / inbox at <strong>{email}</strong> for instructions to access your ledger.</p>
                </div>
                <button
                  id="forgot_pw_back_btn"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(false);
                    setError('');
                  }}
                  className="fancy-button w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Entrance
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gold/80 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Registered Email Address
                  </label>
                  <input
                    id="reset_email_input"
                    type="email"
                    required
                    className="fancy-input w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adventurer@norrath.com"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded border border-red-400/20">
                    {error}
                  </div>
                )}

                <button
                  id="submit_reset_btn"
                  type="submit"
                  disabled={loading}
                  className="fancy-button w-full mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? 'Scribing Link...' : 'Send Recovery Scroll'}
                </button>

                <button
                  id="cancel_reset_btn"
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                  }}
                  className="w-full text-slate-400 hover:text-white transition-colors text-xs text-center font-bold uppercase tracking-wider mt-2 py-1"
                >
                  Cancel and Return
                </button>
              </form>
            )}
          </div>
        ) : (
          /* Normal Auth (Login/Signup) View */
          <>
            <div className="text-center">
              <Swords className="w-16 h-16 text-gold mx-auto mb-4 faction-gold" />
              <h2 className="text-4xl font-serif font-bold faction-gold tracking-tight">Norrath Tracker</h2>
              <p className="text-slate-400 mt-2 font-sans text-sm">Seal your destiny in the chronicles</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gold/80 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  required
                  className="fancy-input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adventurer@norrath.com"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gold/80 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Password
                  </label>
                  {isLogin && (
                    <button
                      id="forgot_password_trigger_btn"
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setError('');
                        setResetSent(false);
                      }}
                      className="text-amber-500/80 hover:text-amber-400 text-xs transition-colors font-semibold"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  className="fancy-input w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded border border-red-400/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="fancy-button w-full mt-4 flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : isLogin ? 'Enter Norrath' : 'Begin Journey'}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gold/20"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-deep-brown px-2 text-parchment/40">Or continue with</span>
              </div>
            </div>

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full bg-white text-gray-900 font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" referrerPolicy="no-referrer" />
              Google
            </button>

            <div className="text-center pt-4">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-gold text-sm hover:underline"
              >
                {isLogin ? "Need a new scroll? Sign up" : "Already a hero? Log in"}
              </button>
            </div>
          </>
        )}

        <div className="flex justify-center items-center gap-2 text-[10px] text-parchment/30 uppercase tracking-widest pt-4">
          <ShieldCheck className="w-3 h-3" /> Secure Aligned Database
        </div>
      </div>
    </div>
  );
}
