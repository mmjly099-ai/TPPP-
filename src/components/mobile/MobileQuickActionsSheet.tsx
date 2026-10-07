import React from 'react';
import {
  X,
  PlusCircle,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  UserPlus,
  Sparkles,
  FileDown,
  ShoppingBag,
  Wallet,
  Printer
} from 'lucide-react';

interface MobileQuickActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewOrder: () => void;
  onOpenPayment: () => void;
  onOpenRecordInflow: () => void;
  onOpenRecordOutflow: () => void;
  onOpenNewExpense: () => void;
  onOpenTransfer: () => void;
  onOpenNewCustomer: () => void;
  onOpenAssistant: () => void;
  onOpenBackup: () => void;
  onOpenInvoice?: () => void;
}

export const MobileQuickActionsSheet: React.FC<MobileQuickActionsSheetProps> = ({
  isOpen,
  onClose,
  onOpenNewOrder,
  onOpenPayment,
  onOpenRecordInflow,
  onOpenRecordOutflow,
  onOpenNewExpense,
  onOpenTransfer,
  onOpenNewCustomer,
  onOpenAssistant,
  onOpenBackup,
  onOpenInvoice
}) => {
  if (!isOpen) return null;

  const actions = [
    {
      id: 'new-order',
      title: 'طلب شراء جديد',
      subtitle: 'شي إن / علي إكسبرس',
      icon: ShoppingBag,
      color: 'bg-emerald-500 text-white',
      bgHover: 'hover:bg-emerald-50 active:bg-emerald-100',
      border: 'border-emerald-200',
      action: () => {
        onClose();
        onOpenNewOrder();
      }
    },
    {
      id: 'print-invoice',
      title: 'طباعة فاتورة A4',
      subtitle: 'توليد وطباعة فاتورة وسند طلب',
      icon: Printer,
      color: 'bg-[#112952] text-[#C5A059]',
      bgHover: 'hover:bg-slate-100 active:bg-slate-200',
      border: 'border-slate-300',
      action: () => {
        onClose();
        if (onOpenInvoice) onOpenInvoice();
      }
    },
    {
      id: 'new-payment',
      title: 'سند قبض دفعة',
      subtitle: 'استلام من عميل لحساب طلب',
      icon: Receipt,
      color: 'bg-blue-600 text-white',
      bgHover: 'hover:bg-blue-50 active:bg-blue-100',
      border: 'border-blue-200',
      action: () => {
        onClose();
        onOpenPayment();
      }
    },
    {
      id: 'record-inflow',
      title: 'سند وارد (إيداع +)',
      subtitle: 'إيداع أموال في صندوق أو بنك',
      icon: ArrowDownLeft,
      color: 'bg-teal-600 text-white',
      bgHover: 'hover:bg-teal-50 active:bg-teal-100',
      border: 'border-teal-200',
      action: () => {
        onClose();
        onOpenRecordInflow();
      }
    },
    {
      id: 'record-outflow',
      title: 'سند صادر (سحب -)',
      subtitle: 'سحب مبالغ أو عهدة نقدية',
      icon: ArrowUpRight,
      color: 'bg-rose-600 text-white',
      bgHover: 'hover:bg-rose-50 active:bg-rose-100',
      border: 'border-rose-200',
      action: () => {
        onClose();
        onOpenRecordOutflow();
      }
    },
    {
      id: 'new-expense',
      title: 'تسجيل مصروف',
      subtitle: 'إيجار، تشغيل، شحن، إعلانات',
      icon: PlusCircle,
      color: 'bg-amber-600 text-white',
      bgHover: 'hover:bg-amber-50 active:bg-amber-100',
      border: 'border-amber-200',
      action: () => {
        onClose();
        onOpenNewExpense();
      }
    },
    {
      id: 'transfer',
      title: 'تحويل بين الصناديق',
      subtitle: 'نقل أرصدة بين البنوك والمحافظ',
      icon: ArrowLeftRight,
      color: 'bg-slate-800 text-white',
      bgHover: 'hover:bg-slate-100 active:bg-slate-200',
      border: 'border-slate-300',
      action: () => {
        onClose();
        onOpenTransfer();
      }
    },
    {
      id: 'new-customer',
      title: 'إضافة عميل جديد',
      subtitle: 'تسجيل بيانات ورقم هاتف العميل',
      icon: UserPlus,
      color: 'bg-indigo-600 text-white',
      bgHover: 'hover:bg-indigo-50 active:bg-indigo-100',
      border: 'border-indigo-200',
      action: () => {
        onClose();
        onOpenNewCustomer();
      }
    },
    {
      id: 'assistant',
      title: 'المساعد الذكي',
      subtitle: 'فحص الحسابات وتلخيص البيانات',
      icon: Sparkles,
      color: 'bg-purple-600 text-white',
      bgHover: 'hover:bg-purple-50 active:bg-purple-100',
      border: 'border-purple-200',
      action: () => {
        onClose();
        onOpenAssistant();
      }
    },
    {
      id: 'backup',
      title: 'نسخة احتياطية (JSON)',
      subtitle: 'حفظ وتأمين جميع بيانات المتجر',
      icon: FileDown,
      color: 'bg-slate-700 text-white',
      bgHover: 'hover:bg-slate-100 active:bg-slate-200',
      border: 'border-slate-300',
      action: () => {
        onClose();
        onOpenBackup();
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Dim Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-up Bottom Sheet */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl p-5 border-t border-slate-200 max-h-[85vh] overflow-y-auto z-10 animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Grab Handle */}
        <div className="flex justify-center -mt-1 mb-3">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">إجراءات سريعة</h3>
            <p className="text-xs text-slate-500">اختر العملية المطلوبة للبدء الفوري بنقرة واحدة</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-2.5 pb-4">
          {actions.map(act => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={act.action}
                className={`p-3 rounded-2xl border text-right transition-all flex items-center gap-3 cursor-pointer bg-white ${act.border} ${act.bgHover}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${act.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {act.title}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                    {act.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>
  );
};
