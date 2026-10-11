import React, { useState } from 'react';
import {
  X,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  User,
  ArrowDownLeft
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Courier } from '../../types';

interface SettleCourierPayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCourierId?: number;
}

export const SettleCourierPayableModal: React.FC<SettleCourierPayableModalProps> = ({
  isOpen,
  onClose,
  preselectedCourierId
}) => {
  const { couriers, accounts, settleCourierPayable, showNotification } = useStore();

  const [courierId, setCourierId] = useState<number>(preselectedCourierId || couriers[0]?.id || 0);
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<number>(
    accounts.find(a => a.type === 'محفظة')?.id || accounts[0]?.id || 0
  );
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const selectedCourier = couriers.find(c => c.id === courierId);
  const selectedWallet = accounts.find(a => a.id === walletId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!courierId) {
      showNotification('يرجى تحديد الموصل', 'warning');
      return;
    }
    if (!amount || amount <= 0) {
      showNotification('يرجى إدخال مبلغ صحيح للتسوية', 'warning');
      return;
    }
    if (!walletId) {
      showNotification('يرجى اختيار المحفظة التي سيتم الدفع منها', 'warning');
      return;
    }

    settleCourierPayable({
      courierId,
      amount: Number(amount),
      walletId,
      paymentDate,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim()
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Navy & Gold */}
        <div className="bg-[#1A3668] text-white p-5 sm:p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-[#C5A059] text-slate-950 flex items-center justify-center font-bold shadow-lg">
              <ArrowDownLeft className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                تسوية وصرف مستحقات الموصّلين
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                صرف أجور الموصل من إحدى المحافظ دون إدراجها كمصروف وساطة تلقائي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          
          {/* Courier Selector & Current Status */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              الموصل المستفيد <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={courierId}
              onChange={e => setCourierId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
            >
              {couriers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.zone || c.coverageZones}
                </option>
              ))}
            </select>

            {selectedCourier && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block">العهدة النقدية بذمته:</span>
                  <span className="font-bold text-amber-700">
                    {(Number(selectedCourier.currentCustodyBalance) || 0).toLocaleString()} ريال
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">مستحقات أجور معلقة:</span>
                  <span className="font-bold text-blue-700">
                    {(Number(selectedCourier.currentPayableBalance) || 0).toLocaleString()} ريال
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Amount to Settle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المبلغ المراد تسويته وصرفه (ريال) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                required
                min="100"
                step="100"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="مثال: 5000"
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>
          </div>

          {/* Wallet to pay from */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المحفظة التي سيتم الدفع والخصم منها <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                required
                value={walletId}
                onChange={e => setWalletId(Number(e.target.value))}
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) — رصيد المحفظة متاح
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              سيُخصم المبلغ مباشرة من رصيد المحفظة المحددة ويقيد كحركة تسوية توصيل.
            </span>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الدفع <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم العملية / مرجع التحويل
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="رقم الحوالة أو السند"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات وبيان التسوية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: تسوية أجور توصيل 10 طلبات عن شهر أكتوبر..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>

          {/* Integrity Note */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              <strong>قيد محاسبي معزول:</strong> سيتم تسجيل خروج المبلغ من المحفظة وتحديث سجل الموصل دون التأثير على أرباح ونشاط وساطة شي إن.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C5A059]" />
              <span>تأكيد التسوية والخصم</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
