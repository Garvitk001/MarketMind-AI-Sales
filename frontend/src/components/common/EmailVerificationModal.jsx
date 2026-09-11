import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Mail, KeyRound, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles, Lock } from 'lucide-react';

export const EmailVerificationModal = () => {
  const { profile, api, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const isVerified = Boolean(profile?.email_verified_at || profile?.email_verified);
  const isAdmin = profile?.role?.code === 'administrator';

  const [step, setStep] = useState('request'); // 'request' | 'verify' | 'success'
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // If user is already verified or is administrator, do not block
  if (isVerified || !profile || isAdmin) {
    return null;
  }

  const handleRequestOtp = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api('/auth/email-verification/request-otp', {
        method: 'POST'
      });
      setStep('verify');
      if (res?.dev_otp_code) {
        setDevOtpHint(res.dev_otp_code);
      }
      addToast({
        type: 'info',
        title: 'OTP Code Sent',
        message: res?.message || `6-digit verification code sent to ${profile.email}`
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP code. Please try again.');
      addToast({
        type: 'error',
        title: 'Error Sending OTP',
        message: err.message || 'Failed to send verification code.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api('/auth/email-verification/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ otp: otp.trim() })
      });
      setStep('success');
      addToast({
        type: 'success',
        title: 'Email Verified!',
        message: 'Your email has been verified. Welcome to your workspace!'
      });
      await refreshProfile();
    } catch (err) {
      const msg = err.message || 'Incorrect 6-digit OTP code. Please enter the valid code sent to your email.';
      setErrorMsg(msg);
      addToast({
        type: 'danger',
        title: 'Verification Failed',
        message: msg
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none"
      style={{ pointerEvents: 'all' }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-8 relative overflow-hidden text-slate-200">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {step === 'request' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Mandatory Verification
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Verify Your Business Email
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                To protect your business workspace and enable sales, inventory, and forecasting features, please verify your email address:
              </p>
              <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-indigo-300 font-semibold font-mono">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">{profile.email}</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleRequestOtp}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-slate-950 font-bold px-5 py-3.5 rounded-2xl shadow-xl hover:shadow-indigo-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Sending 6-Digit OTP...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-slate-950" />
                    <span>Send Verification OTP Code</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-center text-slate-500">
              A 6-digit OTP will be dispatched to your registered mailbox.
            </p>
          </div>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                OTP Validation
              </span>
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Enter 6-Digit OTP
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Enter the code sent to <strong className="text-indigo-300">{profile.email}</strong>.
              </p>
            </div>

            {devOtpHint && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Verification OTP Hint: <strong className="font-mono text-sm tracking-widest text-white">{devOtpHint}</strong></span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-center tracking-[0.4em] text-2xl sm:text-3xl font-mono text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition shadow-inner"
                autoFocus
              />
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-bold px-5 py-3.5 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Verify &amp; Unlock Dashboard</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleRequestOtp}
                  className="text-amber-400 hover:text-amber-300 underline font-semibold transition disabled:opacity-50"
                >
                  Resend OTP Code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('request');
                    setOtp('');
                    setErrorMsg('');
                  }}
                  className="text-slate-400 hover:text-slate-200 transition font-medium"
                >
                  Change Email / Retry
                </button>
              </div>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">Email Successfully Verified!</h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
              Your account has been fully verified. Accessing your business dashboard now...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
