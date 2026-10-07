import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Plus,
  ShoppingBag,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
  FileText
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { PurchaseBatch, Order } from '../types';

export const PurchaseBatchesView: React.FC = () => {
  const {
    purchaseBatches,
    orders,
    accounts,
    addPurchaseBatch,
    cancelPurchaseBatch
  } = useStore();

  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PurchaseBatch | null>(null);

  // Form State
  const [source, setSource] = useState('SHEIN');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseFees, setPurchaseFees] = useState('0');
  const [transferFees, setTransferFees] = useState('0');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Pending orders eligible for purchasing
  const eligibleOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pending' || (o.status !== 'cancelled' && !o.purchaseBatchId));
  }, [orders]);

  // Overall Statistics
  const stats = useMemo(() => {
    const activeBatches = purchaseBatches.filter(b => b.status === 'active');
    const totalSpent = activeBatches.reduce((sum, b) => sum + (b.totalCost || 0), 0);
    const totalFees = activeBatches.reduce((sum, b) => sum + ((b.purchaseFees || 0) + (b.transferFees || 0)), 0);
    const totalOrdersCovered = activeBatches.reduce((sum, b) => sum + (b.orderIds?.length || 0), 0);

    return {
      batchesCount: activeBatches.length,
      totalSpent,
      totalFees,
      totalOrdersCovered
    };
  }, [purchaseBatches]);

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === eligibleOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(eligibleOrders.map(o => o.id));
    }
  };

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      setFormError('يرجى اختيار حساب الدفع أو البطاقة البنكية');
      return;
    }
    if (!purchaseCost || Number(purchaseCost) <= 0) {
      setFormError('يرجى إدخال تكلفة الشراء الإجمالية');
      return;
    }
    if (selectedOrderIds.length === 0) {
      setFormError('يرجى تحديد طلبية واحدة على الأقل لتضمينها في هذه الدفعة');
      return;
    }
    setFormError('');

    addPurchaseBatch({
      source,
      supplierOrderNumber: supplierOrderNumber.trim() || undefined,
      accountId: Number(accountId),
      purchaseCost: Number(purchaseCost) || 0,
      purchaseFees: Number(purchaseFees) || 0,
      transferFees: Number(transferFees) || 0,
      orderIds: selectedOrderIds,
      notes: notes.trim() || undefined
    });

    setIsNewBatchOpen(false);
    // Reset form
    setSource('SHEIN');
    setSupplierOrderNumber('');
    setAccountId('');
    setPurchaseCost('');
    setPurchaseFees('0');
    setTransferFees('0');
    setSelectedOrderIds([]);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 rounded-2xl text-white p-6 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 mb-2">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>مشتريات الوساطة الجماعية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">دفعات الشراء المجمعة (شي إن / علي إكسبرس)</h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              تجميع طلبيات العملاء وشرائها بحساب بنكي أو بطاقة واحدة، مع تسجيل قيود المشتريات والعمولات وتوزيع التكلفة على الطلبات تلقائياً.
            </p>
          </div>

          <button
            onClick={() => {
              if (accounts.length > 0 && !accountId) {
                setAccountId(String(accounts[0].id));
              }
              setIsNewBatchOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs transition-all cursor-pointer text-xs sm:text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل دفعة شراء جماعية</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي دفعات الشراء</span>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.batchesCount}
          </div>
          <span className="text-[11px] text-slate-400">دفعات شراء مجمعة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">الطلبات المشمولة</span>
          <div className="text-2xl font-black text-indigo-700 font-mono">
            {stats.totalOrdersCovered}
          </div>
          <span className="text-[11px] text-slate-400">طلب تم شراؤه من المورد</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي قيمة المشتريات</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {stats.totalSpent.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-slate-400">مدفوع عبر البطاقات والمحافظ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-bold block mb-1">رسوم التحويل وفروق العملة</span>
          <div className="text-xl sm:text-2xl font-black text-amber-800 font-mono">
            {stats.totalFees.toLocaleString()} <span className="text-xs font-normal text-slate-500">YER</span>
          </div>
          <span className="text-[11px] text-slate-400">عمولات شراء مصرفية</span>
        </div>

      </div>

      {/* Batches List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">سجل دفعات الشراء الجماعية</h2>
          </div>
          <span className="text-xs text-slate-500">
            {purchaseBatches.length} دفعة مسجلة
          </span>
        </div>

        {purchaseBatches.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-slate-600 font-bold text-sm">لا توجد دفعات شراء مجمعة مسجلة بعد.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              عند شراء مجموعة طلبات لعملاء من شي إن أو علي إكسبرس، سجّل دفعة شراء جماعية هنا لخصم المبلغ من الحساب وقيد التكلفة آلياً.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {purchaseBatches.map(batch => {
              const batchOrders = orders.filter(o => batch.orderIds.includes(o.id));

              return (
                <div key={batch.id} className="p-4 hover:bg-slate-50 transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-xs px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                        {batch.batchNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">شراء مجمع من {batch.source}</span>
                          {batch.supplierOrderNumber && (
                            <span className="text-xs text-slate-500 font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                              رقم المورد: {batch.supplierOrderNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          تاريخ الشراء: <span className="font-mono text-slate-600">{batch.purchaseDate}</span> • الحساب المسحوب منه: <span className="font-bold text-slate-700">{batch.accountName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left flex items-center sm:flex-col sm:items-end justify-between gap-1">
                      <div className="text-base font-black text-slate-900 font-mono">
                        {batch.totalCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">YER</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        تكلفة البضاعة: {batch.purchaseCost.toLocaleString()} + رسوم: {(batch.purchaseFees + batch.transferFees).toLocaleString()} YER
                      </div>
                    </div>
                  </div>

                  {/* Orders in this batch */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80">
                    <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center justify-between">
                      <span>الطلبات المتضمنة في هذه الدفعة ({batchOrders.length} طلبات):</span>
                      <span className="text-[10px] text-slate-400">تكلفة الشراء المقدرة للطلب: ~{batch.orderIds.length > 0 ? Math.round(batch.purchaseCost / batch.orderIds.length).toLocaleString() : 0} YER</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {batchOrders.map(o => (
                        <span
                          key={o.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs"
                        >
                          <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                          <span className="text-slate-400">|</span>
                          <span className="font-medium text-slate-600">{o.customerName}</span>
                          <span className="text-slate-400">|</span>
                          <span className="font-mono font-bold text-emerald-700">{o.totalAmount?.toLocaleString()} YER</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {batch.notes && (
                    <p className="text-xs text-slate-500 italic">ملاحظات: {batch.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Register Collective Purchase Batch */}
      {isNewBatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">تسجيل دفعة شراء جماعية جديدة</h3>
              </div>
              <button onClick={() => setIsNewBatchOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitBatch} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">مصدر الشراء / المنصة *</label>
                  <select
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                  >
                    <option value="SHEIN">شي إن (SHEIN)</option>
                    <option value="AliExpress">علي إكسبرس (AliExpress)</option>
                    <option value="Alibaba">علي بابا (Alibaba)</option>
                    <option value="Zara">زارا (Zara)</option>
                    <option value="Amazon">أمازون (Amazon)</option>
                    <option value="Other">موقع آخر</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">رقم طلب المورد (Supplier Order No)</label>
                  <input
                    type="text"
                    placeholder="مثال: SHEIN-YE-981423"
                    value={supplierOrderNumber}
                    onChange={e => setSupplierOrderNumber(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">حساب الدفع / البطاقة البنكية *</label>
                <select
                  required
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                >
                  <option value="">اختر الحساب المسحوب منه المبلغ</option>
                  {accounts.filter(a => a.status === 'active').map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تكلفة البضاعة الصافية (YER) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="مثال: 120000"
                    value={purchaseCost}
                    onChange={e => setPurchaseCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">رسوم الشراء وفروق العملة (YER)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 3000"
                    value={purchaseFees}
                    onChange={e => setPurchaseFees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">عمولات التحويل البنكي (YER)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مثال: 1500"
                    value={transferFees}
                    onChange={e => setTransferFees(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Total Calculation Note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-amber-900 font-medium">الإجمالي الكلي المسحوب من الحساب البنكي:</span>
                <span className="font-black font-mono text-amber-950 text-sm">
                  {((Number(purchaseCost) || 0) + (Number(purchaseFees) || 0) + (Number(transferFees) || 0)).toLocaleString()} YER
                </span>
              </div>

              {/* Order Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800">
                    حدد الطلبيات التي تم شراؤها ضمن هذه الدفعة * ({selectedOrderIds.length} محددة)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllOrders}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    {selectedOrderIds.length === eligibleOrders.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الطلبات المتاحة'}
                  </button>
                </div>

                {eligibleOrders.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400">
                    لا توجد طلبات معلقة بانتظار الشراء حالياً.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                    {eligibleOrders.map(o => {
                      const isChecked = selectedOrderIds.includes(o.id);
                      return (
                        <div
                          key={o.id}
                          onClick={() => handleToggleOrder(o.id)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleOrder(o.id)}
                              className="rounded text-amber-600"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{o.orderNumber} • {o.customerName}</div>
                              <div className="text-[11px] text-slate-400">
                                {o.itemsDescription || 'طلبية ملابس ومنتجات'}
                              </div>
                            </div>
                          </div>

                          <div className="text-left font-mono font-bold text-slate-800">
                            {o.totalAmount?.toLocaleString()} YER
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">ملاحظات حول الدفعة</label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول كرتون الشحن أو رابط الدفعة"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-amber-500"
                />
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewBatchOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={selectedOrderIds.length === 0 || !purchaseCost}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black cursor-pointer shadow-xs disabled:opacity-50"
                >
                  تأكيد الشراء وقيد اليومية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
