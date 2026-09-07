import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ShieldCheck, Mail, KeyRound, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles, X } from 'lucide-react';

export const EmailVerificationModal = () => {
  const { profile, api, refreshProfile } = useAuth();
  const { addToast } = useToast();

  const isVerified = Boolean(profile?.email_verified_at || profile?.email_verified);

  const [isOpen, setIsOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [step, setStep] = useState('request'); // 'request' | 'verify' | 'success'
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // If user is already verified, do not show anything
  if (isVerified || !profile) {
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
        title: 'OTP Sent',
        message: res?.message || `6-digit OTP sent to ${profile.email}`
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
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
        message: 'Your email has been successfully verified.'
      });
      await refreshProfile();
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
      addToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message || 'Failed to verify OTP code.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Non-intrusive persistent Top Banner */}
      {!isBannerDismissed && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex items-center justify-between shadow-inner backdrop-blur-md">
          <div className="flex items-center gap-2 max-w-2xl">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>
              <strong>Verify Your Account Email:</strong> Please verify <strong>{profile.email}</strong> to activate full business capabilities and security alerts.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsOpen(true);
                handleRequestOtp();
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-3 py-1 rounded-md transition shadow flex items-center gap-1.5 text-xs"
            >
              Verify Now (OTP)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsBannerDismissed(true)}
              className="text-amber-400/70 hover:text-amber-300 transition p-1"
              title="Dismiss for this session"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Verification Modal Popup */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden text-slate-200">
            {/* Ambient background glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {step === 'request' && (
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Verify Your Email Address</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We need to verify ownership of <strong>{profile.email}</strong>. We will send a secure 6-digit One-Time Password (OTP) to this address.
                </p>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleRequestOtp}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    Send 6-Digit OTP
                  </button>
                </div>
              </div>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Enter 6-Digit Verification Code</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter the OTP code sent to <span className="text-indigo-300 font-medium">{profile.email}</span>. Valid for 10 minutes.
                  </p>
                </div>

                {devOtpHint && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Development Mode OTP: <strong>{devOtpHint}</strong></span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    One-Time Password (OTP)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-center tracking-[0.5em] text-2xl font-mono text-white placeholder:text-slate-600 focus:outline-none transition"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleRequestOtp}
                    className="text-xs text-amber-400 hover:text-amber-300 underline transition disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || otp.length !== 6}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Verify & Activate
                    </button>
                  </div>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Email Successfully Verified!</h3>
                <p className="text-sm text-slate-400">
                  Your account is now fully active with full security privileges enabled.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
