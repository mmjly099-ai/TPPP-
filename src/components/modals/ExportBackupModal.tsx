import React, { useState } from 'react';
import {
  X,
  Download,
  Database,
  CheckCircle2,
  Copy,
  Users,
  ShoppingBag,
  Wallet,
  Receipt,
  Truck,
  BookOpen,
  FileCode
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ExportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportBackupModal: React.FC<ExportBackupModalProps> = ({ isOpen, onClose }) => {
  const {
    customers,
    orders,
    accounts,
    payments,
    expenses,
    shipments,
    journalEntries,
    otherReceivables,
    installmentPlans,
    downloadBackupFile,
    exportBackupJson,
    exportPermanentZipBackup
  } = useStore();

  const [downloadInfo, setDownloadInfo] = useState<{ filename: string; sizeKb: number } | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const res = downloadBackupFile();
    setDownloadInfo(res);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const res = await exportPermanentZipBackup();
      setDownloadInfo(res);
    } catch (e: any) {
      alert(`حدث خطأ أثناء إنشاء حزمة ZIP: ${e?.message || ''}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyJson = () => {
    const jsonStr = exportBackupJson();
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تصدير نسخة احتياطية من البيانات (JSON)</h3>
              <p className="text-xs text-slate-500">حفظ نسخة احتياطية محلية متكاملة لجميع بيانات وحسابات متجر توب ستور</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {downloadInfo && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم تنزيل ملف النسخة الاحتياطية بنجاح!</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-mono">
              اسم الملف: {downloadInfo.filename} ({downloadInfo.sizeKb} كيلوبايت)
            </p>
          </div>
        )}

        {/* Content Summary Grid */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-2">محتويات النسخة الاحتياطية الحالية:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-[11px] text-slate-500 block">العملاء والذمم</span>
                <strong className="font-mono text-slate-900 font-bold">{customers.length} عميل</strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="text-[11px] text-slate-500 block">طلبيات الشراء</span>
                <strong className="font-mono text-slate-900 font-bold">{orders.length} طلبية</strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-[11px] text-slate-500 block">المحافظ والبنوك</span>
                <strong className="font-mono text-slate-900 font-bold">{accounts.length} حسابات</strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-[11px] text-slate-500 block">سندات القبض</span>
                <strong className="font-mono text-slate-900 font-bold">{payments.length} سند</strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-600" />
              <div>
                <span className="text-[11px] text-slate-500 block">شحنات النقل</span>
                <strong className="font-mono text-slate-900 font-bold">{shipments.length} شحنة</strong>
              </div>
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-rose-600" />
              <div>
                <span className="text-[11px] text-slate-500 block">قيود اليومية</span>
                <strong className="font-mono text-slate-900 font-bold">{journalEntries.length} قيد</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Informational note */}
        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-amber-700" />
            <span>لماذا تصدير النسخة الاحتياطية؟</span>
          </p>
          <p className="text-amber-800 leading-relaxed">
            يتم حفظ كافة بيانات التطبيق محلياً في جهازك. يتيح لك تنزيل هذا الملف الاحتفاظ بنسخة دائمة وآمنة على حاسوبك أو هاتفك أو ذاكرة فلاشية، ويمكنك استرجاعها في أي وقت من خلال صفحة «الإعدادات والنسخ الاحتياطي».
          </p>
        </div>

        {/* Raw JSON Preview Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowJsonPreview(!showJsonPreview)}
              className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>{showJsonPreview ? 'إخفاء معاينة كود JSON' : 'معاينة كود JSON قبل التنزيل'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyJson}
              className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'تم النسخ للحافظة!' : 'نسخ النص'}</span>
            </button>
          </div>

          {showJsonPreview && (
            <pre
              dir="ltr"
              className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono max-h-48 overflow-auto whitespace-pre leading-normal border border-slate-800 text-left"
            >
              {exportBackupJson()}
            </pre>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل JSON</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'جاري الضغط...' : 'تنزيل الأرشيف الدائم (ملف ZIP كامل)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
