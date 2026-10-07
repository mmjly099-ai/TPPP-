import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  ShieldAlert,
  ArrowRight,
  Layers,
  Wallet,
  Users,
  FileText,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { DocumentRecord } from '../../types';

interface DocumentImpactDeleteModalProps {
  isOpen: boolean;
  document: DocumentRecord | null;
  onClose: () => void;
  onConfirmCancel: (doc: DocumentRecord, reason: string) => void;
}

export const DocumentImpactDeleteModal: React.FC<DocumentImpactDeleteModalProps> = ({
  isOpen,
  document,
  onClose,
  onConfirmCancel
}) => {
  const [reason, setReason] = useState('');
  const [confirmedRisk, setConfirmedRisk] = useState(false);

  if (!isOpen || !document) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirmCancel(document, reason);
    setReason('');
    setConfirmedRisk(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-l from-rose-900 to-rose-700 text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldAlert className="w-6 h-6 text-rose-300" />
            </div>
            <div>
              <h3 className="text-base font-black">تحذير سلامة الحسابات والبيانات</h3>
              <p className="text-xs text-rose-100 font-medium">إلغاء أو تعديل مستند مالي معتمد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <div className="font-black text-rose-900 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              هذا المستند مرتبط بحركات مالية وقيود وحسابات. هل تريد المتابعة؟
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              المستند: <span className="font-bold font-mono">{document.documentNumber}</span> ({document.documentTypeLabel})
              المبلغ: <span className="font-bold font-mono">{document.amount.toLocaleString()} ريال</span>.
            </p>
          </div>

          {/* Impact list */}
          <div>
            <div className="font-bold text-slate-800 mb-2">العناصر والتأثيرات المحاسبية التي ستتأثر وتُعكس تلقائياً:</div>
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">رصيد العميل:</span>
                  <span className="text-slate-600 mr-1">سيتم عكس التأثير على رصيد ومديونية {document.customerName || 'العميل'}.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">رصيد الخزينة / المحفظة:</span>
                  <span className="text-slate-600 mr-1">تعديل رصيد حساب الدفع الفعلي وعكس الحركات النقدية.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Layers className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">القيد المحاسبي وسجل الأستاذ:</span>
                  <span className="text-slate-600 mr-1">توليد قيد تسوية عكسي لضمان توازن دفتر اليومية العام دون ترك بيانات يتيمة.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">كشف الحساب وسجل التدقيق:</span>
                  <span className="text-slate-600 mr-1">تسجيل العملية في سجل التدقيق (Audit Log) مع إبقاء الأثر المالي للتتبع التاريخي.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 block text-xs">
              سبب الإلغاء أو التعديل (إلزامي للتدقيق المحاسبي):
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="مثال: خطأ في إدخال المبلغ، أو رغبة العميل في استرجاع المبلغ..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Checkbox risk acknowledgement */}
          <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
            <input
              type="checkbox"
              checked={confirmedRisk}
              onChange={e => setConfirmedRisk(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <span className="text-[11px] font-bold text-slate-700">
              أفهم التأثير المالي وأوافق على اعتماد عكس العمليات المحاسبية المرتبطة.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            تراجع وإلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason.trim() || !confirmedRisk}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            تأكيد إلغاء المستند وعكس القيود
          </button>
        </div>
      </div>
    </div>
  );
};
