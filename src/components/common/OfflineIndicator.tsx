import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl border border-emerald-500 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Wifi className="w-3.5 h-3.5 text-white" />
        <span>تمت استعادة الاتصال بالإنترنت بنجاح</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900/95 px-3.5 py-2 text-xs font-bold text-amber-300 shadow-xl border border-amber-500/40 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>وضع العمل دون اتصال — يتم استخدام البيانات المحفوظة محلياً</span>
    </div>
  );
};
