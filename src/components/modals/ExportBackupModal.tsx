import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileCode, Archive, CheckCircle, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { exportToXlsx } from '../../utils/dataExporter';

interface ExportBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportBackupModal: React.FC<ExportBackupModalProps> = ({ isOpen, onClose }) => {
  const { data, downloadBackupFile, exportPermanentZipBackup } = useStore();
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleExportJson = () => {
    try {
      downloadBackupFile();
      setSuccessMsg('تم تحميل النسخة الاحتياطية JSON بنجاح');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExportXlsx = () => {
    try {
      exportToXlsx(data);
      setSuccessMsg('تم تصدير ملف Excel بنجاح');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      await exportPermanentZipBackup();
      setSuccessMsg('تم إنشاء وتحميل الحزمة المضغوطة ZIP بنجاح');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">تصدير وحفظ النسخ الاحتياطية</h3>
              <p className="text-xs text-slate-500">حفظ نسخة آمنة من بيانات المتجر بالكامل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {/* JSON Option */}
          <button
            onClick={handleExportJson}
            className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">نسخة JSON الأصلية الكاملة</h4>
                <p className="text-[11px] text-slate-500">متوافقة مع الاستعادة الشاملة لكافة الجداول</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
          </button>

          {/* Excel Option */}
          <button
            onClick={handleExportXlsx}
            className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">مصنف Excel (.xlsx) شامل</h4>
                <p className="text-[11px] text-slate-500">جداول متعددة (العملاء، الطلبات، السندات، المصروفات)</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
          </button>

          {/* Zip Option */}
          <button
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="w-full text-right p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isExportingZip ? 'جاري التحضير...' : 'حزمة أرشيف شاملة (.zip)'}
                </h4>
                <p className="text-[11px] text-slate-500">تحتوي على ملفات الجداول المنفصلة وملف الاستعادة الموحد</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </button>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>بياناتك محفوظة ومحمية 100%</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
