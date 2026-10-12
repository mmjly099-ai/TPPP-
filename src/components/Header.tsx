import React from 'react';
import {
  ShoppingBag,
  PlusCircle,
  ArrowLeftRight,
  Receipt,
  FileDown,
  FileUp,
  Sparkles,
  Phone,
  MapPin,
  RefreshCw,
  Lock,
  Activity
} from 'lucide-react';
import { useStore } from '../context/StoreContext';

import { NavTab } from './Navigation';
import { PWAInstallButton } from './common/PWAInstallButton';
import topStoreLogo from '../assets/images/regenerated_image_1791812410862.webp';

import { BookOpen } from 'lucide-react';

interface HeaderProps {
  onOpenNewOrder: () => void;
  onOpenNewExpense: () => void;
  onOpenTransfer: () => void;
  onOpenPayment: () => void;
  onOpenBackup: () => void;
  onOpenAssistant: () => void;
  onOpenSystemManual?: () => void;
  onNavigate?: (tab: NavTab) => void;
  onLock?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewOrder,
  onOpenNewExpense,
  onOpenTransfer,
  onOpenPayment,
  onOpenBackup,
  onOpenAssistant,
  onOpenSystemManual,
  onNavigate,
  onLock
}) => {
  const { settings, totalCashAndBanks, totalCustomerDebts, isSyncing, lastSyncTime, syncWithServer } = useStore();

  const storeName = settings.storeName || 'TOP STORE – توب ستور';
  const businessName = settings.businessName || 'وسيط شراء وتسوق إلكتروني';
  const phone = settings.phone || '772791991';
  const address = settings.address || 'صنعاء ـ عصر ـ جوار جامعة سبأ';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Mobile Compact Header (شاشات الهواتف) */}
        <div className="flex md:hidden items-center justify-between py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-amber-400 p-0.5 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
              <img src={topStoreLogo} alt="TOP STORE" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 leading-none truncate">
                {storeName}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.2 rounded font-mono">
                  سيولة: {(totalCashAndBanks / 1000).toFixed(0)}k ر.ي
                </span>
              </div>
            </div>
          </div>

          {/* Quick Mobile Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton className="text-[11px] px-2 py-1" />
            <button
              onClick={onOpenNewOrder}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              title="طلب جديد"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>طلب</span>
            </button>

            <button
              onClick={onOpenAssistant}
              className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center hover:bg-purple-100 transition-colors cursor-pointer"
              title="المساعد الذكي"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
            </button>

            {onOpenSystemManual && (
              <button
                onClick={onOpenSystemManual}
                className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition-colors cursor-pointer shadow-xs"
                title="دليل النظام الشامل (PDF)"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onOpenBackup}
              className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center hover:bg-amber-100 transition-colors cursor-pointer"
              title="تصدير نسخة احتياطية"
            >
              <FileDown className="w-4 h-4 text-amber-700" />
            </button>

            <button
              onClick={() => syncWithServer()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                isSyncing
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={lastSyncTime ? `متزامن سحابياً (${lastSyncTime}) - انقر للتحديث` : 'مزامنة مع السيرفر'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : ''}`} />
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('supabase-monitor')}
                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors cursor-pointer"
                title="مراقبة مزامنة الأجهزة و Supabase"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            )}

            {onLock && (
              <button
                onClick={onLock}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                title="قفل النظام وتسجيل الخروج"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop / Tablet Full Header (شاشات الكمبيوتر والأجهزة اللوحية) */}
        <div className="hidden md:flex flex-row items-center justify-between py-3 gap-3">
          
          {/* Brand & Store Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border-2 border-[#C5A059] p-0.5 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
              <img src={topStoreLogo} alt="TOP STORE" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {storeName}
                </h1>
                <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-md">
                  {businessName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {address}
                </span>
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {phone}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar in Header */}
          <div className="hidden xl:flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">إجمالي المحافظ والبنوك</span>
              <span className="font-bold text-emerald-700 text-sm font-mono">
                {totalCashAndBanks.toLocaleString()} ريال
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div>
              <span className="text-slate-500 block">ديون العملاء</span>
              <span className="font-bold text-amber-700 text-sm font-mono">
                {totalCustomerDebts.toLocaleString()} ريال
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-quick-new-order"
              onClick={onOpenNewOrder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب جديد</span>
            </button>

            <button
              id="btn-quick-new-payment"
              onClick={onOpenPayment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>سند قبض</span>
            </button>

            <button
              id="btn-quick-transfer"
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>تحويل بين المحافظ</span>
            </button>

            <button
              id="btn-quick-expense"
              onClick={onOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>مصروف</span>
            </button>

            <button
              id="btn-quick-assistant"
              onClick={onOpenAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-colors cursor-pointer"
              title="المساعد الذكي وفحص النظام"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">المساعد الذكي</span>
            </button>

            {onOpenSystemManual && (
              <button
                id="btn-system-manual"
                onClick={onOpenSystemManual}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="شرح كافة أقسام النظام بالتفصيل مع إمكانية الطباعة والحفظ كـ PDF"
              >
                <BookOpen className="w-4 h-4" />
                <span>دليل النظام (PDF)</span>
              </button>
            )}

            <button
              id="btn-quick-backup"
              onClick={onOpenBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="تصدير نسخة احتياطية من البيانات (JSON)"
            >
              <FileDown className="w-4 h-4 text-amber-700" />
              <span>تصدير نسخة (JSON)</span>
            </button>

            {onNavigate && (
              <button
                id="btn-quick-import"
                onClick={() => onNavigate('data-import')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="استيراد ونقل ملفات Excel و CSV و JSON"
              >
                <FileUp className="w-4 h-4" />
                <span>استيراد بيانات</span>
              </button>
            )}

            {/* Cloud Sync & Supabase Monitor Status Button */}
            <div className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 p-0.5 shadow-2xs">
              <button
                onClick={() => syncWithServer()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                title="مزامنة فورية لكافة الأجهزة"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : 'text-emerald-600'}`} />
                <span className="hidden lg:inline">{isSyncing ? 'جارٍ التزامن...' : 'متزامن'}</span>
                {lastSyncTime && !isSyncing && (
                  <span className="font-mono text-[10px] text-emerald-600 hidden xl:inline">({lastSyncTime})</span>
                )}
              </button>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('supabase-monitor')}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-200/60 rounded-md transition-colors cursor-pointer border-r border-emerald-200/80"
                  title="فتح وحدة مراقبة المزامنة وسيرفر Supabase وفحص أجهزة اللابتوب والهاتف"
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden 2xl:inline">مراقبة الأجهزة</span>
                </button>
              )}
            </div>

            {/* Lock / Logout Button */}
            {onLock && (
              <button
                onClick={onLock}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                title="قفل النظام وتسجيل الخروج"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>قفل</span>
              </button>
            )}

            <PWAInstallButton />
          </div>

        </div>
      </div>
    </header>
  );
};
