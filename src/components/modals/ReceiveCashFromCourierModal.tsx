import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Calendar,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  User,
  ArrowUpRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Courier } from '../../types';

interface ReceiveCashFromCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCourierId?: number;
}

export const ReceiveCashFromCourierModal: React.FC<ReceiveCashFromCourierModalProps> = ({
  isOpen,
  onClose,
  preselectedCourierId
}) => {
  const { couriers, accounts, deliveryOrders, receiveCashFromCourier, showNotification } = useStore();

  const [courierId, setCourierId] = useState<number>(preselectedCourierId || couriers[0]?.id || 0);
  const [amount, setAmount] = useState<number>(0);
  const [depositAccountId, setDepositAccountId] = useState<number>(
    accounts.find(a => a.type === 'محفظة' || a.name.includes('جيب'))?.id || accounts[0]?.id || 0
  );
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const targetId = preselectedCourierId || couriers[0]?.id || 0;
      setCourierId(targetId);
      const targetCourier = couriers.find(c => c.id === targetId);
      if (targetCourier && (targetCourier.currentCustodyBalance || 0) > 0) {
        setAmount(Number(targetCourier.currentCustodyBalance) || 0);
      } else {
        setAmount(0);
      }
    }
  }, [isOpen, preselectedCourierId, couriers]);

  if (!isOpen) return null;

  const selectedCourier = couriers.find(c => c.id === courierId);
  const selectedAccount = accounts.find(a => a.id === depositAccountId);
  const courierCashOrders = deliveryOrders.filter(
    o => o.courierId === courierId && ((o.custodyRecordedAmount || 0) > 0 || (o.collectionMethod === 'cash_to_courier' && o.status === 'delivered'))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!courierId) {
      showNotification('يرجى تحديد الموصل', 'warning');
      return;
    }
    if (!amount || amount <= 0) {
      showNotification('يرجى إدخال مبلغ صحيح', 'warning');
      return;
    }

    receiveCashFromCourier({
      courierId,
      amount: Number(amount),
      depositAccountId: depositAccountId || undefined,
      receivedDate,
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
              <ArrowUpRight className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                استلام نقدية عهدة من الموصل وتوريدها
              </h2>
              <p className="text-xs text-blue-200 font-medium">
                تصفية وتوريد المبالغ النقدية المحصلة من العميلات وتحديث عهدة الموصل
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
          
          {/* Courier Selector & Current Custody */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              الموصل المسلّم للنقدية <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={courierId}
              onChange={e => setCourierId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
            >
              {couriers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — عهدته النقدية الحالية: {(Number(c.currentCustodyBalance) || 0).toLocaleString()} ريال
                </option>
              ))}
            </select>

            {selectedCourier && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-amber-900 font-semibold">إجمالي الرصيد النقدي في ذمته الآن:</span>
                  <span className="font-black text-sm text-amber-950">
                    {(Number(selectedCourier.currentCustodyBalance) || 0).toLocaleString()} ريال
                  </span>
                </div>
                {courierCashOrders.length > 0 && (
                  <div className="pt-1.5 border-t border-amber-200/70 flex flex-wrap gap-1.5">
                    {courierCashOrders.map(o => (
                      <span key={o.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[10px] font-black text-amber-900">
                        طلب رقم #{o.orderNumber} ({o.customerName}): {(o.custodyRecordedAmount || o.finalPaymentAmount || o.deliveryFee || 0).toLocaleString()} ر.ي
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المبلغ المستلم فعلياً (ريال) <span className="text-rose-500">*</span>
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
                placeholder="مثال: 15000"
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
              />
            </div>
            {selectedCourier && amount > (selectedCourier.currentCustodyBalance || 0) && (
              <span className="text-[11px] text-amber-700 mt-1 block">
                تنبيه: المبلغ المدخل أكبر من العهدة المسجلة حالياً ({selectedCourier.currentCustodyBalance || 0} ريال).
              </span>
            )}
          </div>

          {/* Deposit Account / Wallet */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              إيداع المبلغ المستلم في (المحفظة / الصندوق)
            </label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <select
                value={depositAccountId}
                onChange={e => setDepositAccountId(Number(e.target.value))}
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1A3668] cursor-pointer"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              سيتم تسجيل عملية استلام نقدي مستقلة، وتحديث رصيد الصندوق/المحفظة مع إنقاص عهدة الموصل مباشرة.
            </span>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              تاريخ الاستلام <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={receivedDate}
              onChange={e => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: توريد مبالغ توصيل طلبيات يوم الخميس..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
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
              <span>تأكيد استلام النقدية وتحديث العهدة</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
