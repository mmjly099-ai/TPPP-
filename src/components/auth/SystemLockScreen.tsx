import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, ArrowLeft, Store, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

import { useStore } from '../../context/StoreContext';

interface SystemLockScreenProps {
  onUnlock: () => void;
  syncTime?: string | null;
}

export const SystemLockScreen: React.FC<SystemLockScreenProps> = ({ onUnlock, syncTime }) => {
  const { syncWithServer } = useStore();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const trimmed = password.trim().toLowerCase();

    // Verify password locally and with server
    let isValid = trimmed === 'masnaamasnaa';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed })
      });
      if (res.ok) {
        isValid = true;
      }
    } catch {
      // offline fallback to default password
    }

    if (isValid) {
      try {
        localStorage.removeItem('topstore_auth_session');
        sessionStorage.setItem('topstore_session_auth', 'authenticated_masnaamasnaa');
      } catch (err) {
        console.warn('Session auth note:', err);
      }

      // Immediately pull freshest data from server/cloud on unlock
      try {
        await syncWithServer();
      } catch {}

      setTimeout(() => {
        setIsSubmitting(false);
        onUnlock();
      }, 100);
    } else {
      setIsSubmitting(false);
      setErrorMsg('كلمة المرور غير صحيحة! يرجى إدخال كلمة المرور المعتمدة للنظام.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4 min-h-screen overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20 relative my-auto">
        
        {/* Decorative Top Accent */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        <div className="p-6 sm:p-8 space-y-5">
          
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-20 h-20 rounded-2xl bg-white p-1 border-2 border-amber-500 shadow-xl mx-auto overflow-hidden flex items-center justify-center">
              <img
                src="/top_store_logo.jpg"
                alt="شعار توب ستور TOP STORE"
                className="w-full h-full object-contain"
              />
            </div>

            <h1 className="text-xl font-black text-slate-900 pt-2 tracking-tight">
              توب ستور | TOP STORE
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              نظام إدارة الطلبيات والحسابات والتشغيل المالي المتزامن
            </p>
          </div>

          {/* Sync & Device Cloud Badge + Install App Button */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-right min-w-0">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>تزامن سحابي فوري</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  متوافق مع كافة الهواتف والأجهزة
                </p>
              </div>
            </div>
            <PWAInstallButton />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>كلمة مرور النظام</span>
                <span className="text-[11px] text-slate-400 font-normal">مطلوبة لدخول البرنامج</span>
              </label>

              <div className="relative">
                <div className="absolute right-3.5 top-3.5 text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  placeholder="أدخل كلمة المرور..."
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className={`w-full pr-10 pl-11 py-3 text-sm rounded-xl border bg-slate-50/50 focus:bg-white transition-all font-mono tracking-wider ${
                    errorMsg
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 text-rose-900'
                      : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-slate-800'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Multi-Device Security Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold block text-slate-800">حماية مشددة على كافة الهواتف واللابتوبات</span>
                <span className="text-[11px] text-slate-600">
                  يتطلب النظام إدخال كلمة المرور في كل تسجيل دخول لحماية البيانات والمزامنة الفورية.
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ التحقق والمزامنة...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول النظام ومزامنة أحدث البيانات</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              نظام محمي ومشفر • متجر توب ستور اليمن
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
