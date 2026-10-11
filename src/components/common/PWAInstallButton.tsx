import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Apple } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGeneralGuide, setShowGeneralGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed PWA (standalone), suppress button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const installed = await install();
        if (!installed && !window.__deferredPwaPrompt) {
          setShowGeneralGuide(true);
        }
      } finally {
        setIsInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowGeneralGuide(true);
    }
  };

  // Chromium / Android / Desktop native prompt flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className={`bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 p-3 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-400/40 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-950">تثبيت تطبيق توب ستور على جهازك</h4>
              <p className="text-xs text-slate-900/80">تشغيل أسرع، بدون شريط المتصفح، وعمل سلس في وضع عدم الاتصال</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shrink-0"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{isInstalling ? 'جاري التثبيت...' : 'تثبيت التطبيق الآن'}</span>
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        disabled={isInstalling}
        title="تثبيت توب ستور كتطبيق مستقل"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer shrink-0 ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-slate-950" />
        <span>{isInstalling ? 'تثبيت...' : 'تثبيت التطبيق'}</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {variant === 'banner' ? (
          <div className={`bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 p-3 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-400/40 ${className}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Apple className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-950">تثبيت تطبيق توب ستور على iPhone / iPad</h4>
                <p className="text-xs text-slate-900/80">أضف التطبيق إلى شاشتك الرئيسية للفتح المباشر</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shrink-0"
            >
              <Apple className="w-4 h-4 text-amber-400" />
              <span>طريقة التثبيت على iOS</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            title="تثبيت توب ستور على الآيفون"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 shadow-xs transition-all cursor-pointer shrink-0 ${className}`}
          >
            <Apple className="w-3.5 h-3.5 text-amber-400" />
            <span>تثبيت على iOS</span>
          </button>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" dir="rtl">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Apple className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-slate-900">تثبيت التطبيق على iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <p>اضغط على زر <strong>المشاركة (Share)</strong> في أسفل شاشة متصفح سفاري Safari.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-black flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <p>مرر لأسفل القائمة واختر <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>.</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <p>اضغط <strong>إضافة (Add)</strong> في الزاوية العلوية ليظهر التطبيق في شاشة تطبيقاتك فوراً!</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer"
              >
                فهمت ذلك ✓
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for desktop/browsers before prompt fires
  return (
    <>
      {variant === 'banner' ? (
        <div className={`bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 p-3 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 border border-amber-400/40 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-950">تثبيت تطبيق توب ستور على جهازك</h4>
              <p className="text-xs text-slate-900/80">تشغيل أسرع، بدون شريط المتصفح، وعمل سلس في وضع عدم الاتصال</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGeneralGuide(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm shrink-0"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>تثبيت كتطبيق</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowGeneralGuide(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer shrink-0 ${className}`}
          title="تثبيت التطبيق على جهازك"
        >
          <Download className="w-3.5 h-3.5 text-slate-950" />
          <span>تثبيت كتطبيق</span>
        </button>
      )}

      {showGeneralGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">تثبيت تطبيق توب ستور</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGeneralGuide(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 text-[11px]">1</span>
                <p>اضغط على قائمة خيارات المتصفح (زر النقاط الثلاث <strong>⋮</strong> أو أيقونة التثبيت في شريط العنوان).</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-black flex items-center justify-center shrink-0 text-[11px]">2</span>
                <p>اختر <strong>«تثبيت التطبيق» (Install App)</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.</p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black flex items-center justify-center shrink-0 text-[11px]">3</span>
                <p>سيعمل تطبيق <strong>توب ستور</strong> بنافذة مستقلة فائقة السرعة مع حفظ كامل البيانات تلقائياً.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGeneralGuide(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer"
            >
              فهمت ذلك ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
};
