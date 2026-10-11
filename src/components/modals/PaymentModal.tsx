import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, User, Wallet, Sparkles, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Order, Payment } from '../../types';
import { numberToArabicWords } from '../../utils/tafqeet';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedCustomer?: Customer | null;
  preSelectedOrder?: Order | null;
  onPaymentSuccess?: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  preSelectedCustomer,
  preSelectedOrder,
  onPaymentSuccess
}) => {
  const { customers, orders, accounts, recordPayment, getCustomerBalance, payments } = useStore();

  const [customerId, setCustomerId] = useState<number>(() => preSelectedCustomer?.id || customers[0]?.id || 0);
  const [orderId, setOrderId] = useState<number | undefined>(() => preSelectedOrder?.id || undefined);
  const [amount, setAmount] = useState<number>(() => preSelectedOrder?.remainingAmount || 0);
  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب') || a.name.includes('كريمي')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });
  const [paymentType, setPaymentType] = useState<string>('دفعة أولى');
  const [statement, setStatement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preSelectedCustomer) {
      setCustomerId(preSelectedCustomer.id);
      const debt = getCustomerBalance(preSelectedCustomer.id);
      if (!preSelectedOrder && debt > 0) {
        setAmount(debt);
      }
    }
    if (preSelectedOrder) {
      setOrderId(preSelectedOrder.id);
      setCustomerId(preSelectedOrder.customerId);
      setAmount(preSelectedOrder.remainingAmount);
      const pType = preSelectedOrder.paidAmount === 0 ? 'عربون / دفعة أولى' : 'دفعة لاحقة';
      setPaymentType(pType);
      setStatement(`سداد ${pType} للطلب ${preSelectedOrder.orderNumber} (${preSelectedOrder.site})`);
    } else {
      setStatement('سداد دفعة على الحساب');
    }
  }, [preSelectedCustomer, preSelectedOrder]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => c.id === customerId);
  const currentDebt = selectedCustomer ? getCustomerBalance(selectedCustomer.id) : 0;
  const customerOrders = orders.filter(o => o.customerId === customerId && o.remainingAmount > 0 && o.status !== 'cancelled');

  const amountInWords = amount > 0 ? numberToArabicWords(amount) : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!customerId) {
      setFormError('يرجى تحديد العميل المستلم منه');
      return;
    }
    if (amount <= 0) {
      setFormError('يرجى إدخال مبلغ دفع صحيح أكبر من الصفر');
      return;
    }
    setFormError('');
    setIsSubmitting(true);

    const selectedAcc = accounts.find(a => a.id === accountId);

    try {
      const createdPayment = recordPayment({
        customerId,
        orderId: orderId || undefined,
        amount: Number(amount),
        accountId,
        paymentMethod: selectedAcc?.name || 'محفظة',
        paymentType,
        statement: statement.trim() || undefined,
        notes: notes.trim() || undefined
      });

      setIsSubmitting(false);
      onClose();

      if (onPaymentSuccess && createdPayment) {
        onPaymentSuccess(createdPayment);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      setFormError('حدث خطأ أثناء حفظ سند القبض');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#1A3668] text-white flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">إصدار سند قبض مالي رسمي</h3>
              <p className="text-xs text-slate-500">إثبات استلام مبالغ نقدية أو بنكية وربطها بالعميل والطلب والقيود</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Customer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">استلمنا من العميل *</label>
              {selectedCustomer && (
                <span className="text-[11px] text-amber-900 bg-amber-50 font-mono font-bold px-2 py-0.5 rounded-md border border-amber-200">
                  إجمالي الذمة المستحقة: {currentDebt.toLocaleString()} ريال
                </span>
              )}
            </div>
            <select
              value={customerId}
              onChange={e => {
                const id = Number(e.target.value);
                setCustomerId(id);
                setOrderId(undefined);
                const debt = getCustomerBalance(id);
                if (debt > 0) setAmount(debt);
              }}
              className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium"
              required
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} ({c.governorate})
                </option>
              ))}
            </select>
          </div>

          {/* Linked order */}
          {customerOrders.length > 0 && (
            <div>
              <label className="font-bold text-slate-700 block mb-1">ربط السند بطلبية محددة (اختياري)</label>
              <select
                value={orderId || ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setOrderId(val);
                  if (val) {
                    const ord = orders.find(o => o.id === val);
                    if (ord) {
                      setAmount(ord.remainingAmount);
                      setStatement(`سداد متبقي للطلب ${ord.orderNumber} (${ord.site})`);
                      setPaymentType(ord.remainingAmount <= amount ? 'دفعة نهائية' : 'دفعة لاحقة');
                    }
                  } else {
                    setStatement('سداد دفعة على الحساب');
                    setPaymentType('سداد حساب');
                  }
                }}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium"
              >
                <option value="">دفعة عامة على الحساب</option>
                {customerOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} - {o.site} (المتبقي: {o.remainingAmount.toLocaleString()} ريال)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Order Details & Previous Payments Panel */}
          {orderId && (() => {
            const linkedOrder = orders.find(o => o.id === orderId);
            if (!linkedOrder) return null;
            const prevPayments = payments.filter(p => p.orderId === orderId && p.status !== 'cancelled');
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">بيانات الطلب #{linkedOrder.orderNumber} ({linkedOrder.site || 'شي إن'})</span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                    إجمالي الطلب: {(linkedOrder.totalAmount || 0).toLocaleString()} YER
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-emerald-800 block font-medium">المدفوع سابقاً:</span>
                    <span className="font-mono font-bold text-emerald-900 text-xs">{(linkedOrder.paidAmount || 0).toLocaleString()} YER</span>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-rose-800 block font-medium">المتبقي المطلوب:</span>
                    <span className="font-mono font-bold text-rose-900 text-xs">{(linkedOrder.remainingAmount || 0).toLocaleString()} YER</span>
                  </div>
                </div>

                {/* Previous Payments History */}
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    الدفعات السابقة المسجلة للطلب ({prevPayments.length}):
                  </span>
                  {prevPayments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-100">
                      لا توجد دفعات سابقة لهذا الطلب حتى الآن.
                    </p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1.5">
                      {prevPayments.map((pmt) => (
                        <div key={pmt.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 font-mono">#{pmt.receiptNumber || pmt.paymentNumber}</span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-slate-600">{pmt.paymentType || 'دفعة'} ({pmt.paymentMethod})</span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="font-mono text-slate-500">{pmt.paymentDate ? pmt.paymentDate.split('T')[0] : ''}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-700">{Number(pmt.amount).toLocaleString()} YER</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Amount & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المبلغ المقبوض (ريال) *</label>
              <input
                type="number"
                min="1"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-emerald-700 text-sm focus:border-[#1A3668]"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">المحفظة / الحساب المودع فيه *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-xl p-2.5 bg-white font-medium"
                required
              >
                {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tafqeet in words preview */}
          {amountInWords && (
            <div className="bg-[#1A3668]/5 border border-[#1A3668]/15 rounded-xl p-2.5 text-[11px]">
              <span className="text-slate-500 font-medium">المبلغ كتابة: </span>
              <strong className="text-[#1A3668] font-bold">{amountInWords}</strong>
            </div>
          )}

          {/* Payment Type */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">نوع الدفعة</label>
            <div className="grid grid-cols-4 gap-1.5">
              {['عربون / دفعة أولى', 'دفعة لاحقة', 'دفعة نهائية', 'سداد حساب'].map(pt => (
                <button
                  type="button"
                  key={pt}
                  onClick={() => setPaymentType(pt)}
                  className={`py-1.5 px-2 rounded-lg text-center text-[10px] font-bold transition-colors cursor-pointer ${
                    paymentType === pt
                      ? 'bg-[#1A3668] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          </div>

          {/* Statement & Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">البيان (وذلك عن)</label>
            <input
              type="text"
              value={statement}
              onChange={e => setStatement(e.target.value)}
              placeholder="مثال: عربون ودفعة أولى للطلب أو سداد دفعة..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية أو رقم الحوالة</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: رقم الحوالة، اسم المودع، إلخ..."
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>يتم توليد قيد محاسبي وسجل تدقيق تلقائياً</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#1A3668] hover:bg-[#152c54] text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإصدار...' : 'إصدار سند القبض'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
