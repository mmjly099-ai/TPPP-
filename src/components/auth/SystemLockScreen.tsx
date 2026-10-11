import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, ArrowLeft, Store, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';

interface SystemLockScreenProps {
  onUnlock: () => void;
  syncTime?: string | null;
}

export const SystemLockScreen: React.FC<SystemLockScreenProps> = ({ onUnlock, syncTime }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const trimmed = password.trim();

    // Check system password: masnaamasnaa
    if (trimmed === 'masnaamasnaa') {
      if (rememberMe) {
        try {
          localStorage.setItem('topstore_auth_session', 'authenticated_masnaamasnaa');
        } catch (err) {
          console.warn('Could not save auth session to storage', err);
        }
      }
      setTimeout(() => {
        setIsSubmitting(false);
        onUnlock();
      }, 200);
    } else {
      setIsSubmitting(false);
      setErrorMsg('كلمة المرور غير صحيحة! يرجى إدخال كلمة المرور المعتمدة للنظام.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4 min-h-screen"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-500/20 relative">
        
        {/* Decorative Top Accent */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
              <Store className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h1 className="text-xl font-black text-slate-900 pt-2 tracking-tight">
              توب ستور | TOP STORE
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              نظام إدارة الطلبيات والحسابات والتشغيل المالي المتزامن
            </p>
          </div>

          {/* Sync & Device Cloud Badge */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-right flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>تزامن سحابي فوري</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                يتم تحديث البيانات لحظياً على أي جوال وجهاز مسجل
              </p>
            </div>
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
                  autoFocus
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

            {/* Remember Me Option */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span className="font-medium">تذكر تسجيل الدخول على هذا الجهاز</span>
              </label>
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
