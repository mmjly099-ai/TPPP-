import React from 'react';
import {
  CheckCircle2,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  DollarSign
} from 'lucide-react';

interface InteractiveActionModalProps {
  isOpen: boolean;
  operation: {
    type: 'expense' | 'payment' | 'transfer';
    details: Record<string, any>;
    summaryText: string;
  } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const InteractiveActionModal: React.FC<InteractiveActionModalProps> = ({
  isOpen,
  operation,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !operation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1A3668] text-white p-4.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="text-base font-black">تأكيد عملية محاسبية مقترحة</h3>
              <p className="text-xs text-slate-200">مساعد TOP STORE الذكي يطلب اعتمادك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5">
            <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>مراجعة تفاصيل العملية قبل القيد في الدفاتر:</span>
            </div>
            <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
              {operation.summaryText}
            </p>
          </div>

          {/* Operation details breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">نوع العملية:</span>
              <span className="font-black text-slate-900">
                {operation.type === 'expense' ? 'سند صرف (مصروف تشغيلي)' : 'حركة مالية'}
              </span>
            </div>

            {operation.details.amount && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">المبلغ المالي:</span>
                <span className="font-black text-sm font-mono text-[#1A3668]">
                  {Number(operation.details.amount).toLocaleString()} ريال
                </span>
              </div>
            )}

            {operation.details.category && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200">
                <span className="text-slate-500 font-medium">التصنيف:</span>
                <span className="font-bold text-slate-800">{operation.details.category}</span>
              </div>
            )}

            {operation.details.accountName && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">الحساب المالي:</span>
                <span className="font-bold text-slate-900">{operation.details.accountName}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            عند الضغط على تأكيد، سيتم خصم المبلغ من رصيد الحساب المختار فوراً وتوليد القيد المحاسبي المعتمد.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            إلغاء وتراجع
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            تأكيد العملية وحفظها
          </button>
        </div>
      </div>
    </div>
  );
};
