import React, { useState } from 'react';
import { X, ChevronDown, UserPlus, Check, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose }) => {
  const { customers, accounts, addOrder, addCustomer, marketingCampaigns, marketingChannels, discountCodes } = useStore();

  const [customerId, setCustomerId] = useState<number>(() => customers[0]?.id || 0);
  const [customerOrderCode, setCustomerOrderCode] = useState<string>('');
  const [shipmentNumber, setShipmentNumber] = useState<string>('223');
  const [orderDate, setOrderDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [itemsCount, setItemsCount] = useState<number>(1);
  const [site, setSite] = useState<string>('SHEIN');

  // Pricing & Financials
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(1000);
  const [notes, setNotes] = useState<string>('');

  // Quick Customer Creation State
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGov, setNewCustGov] = useState('صنعاء');
  const [newCustPickup, setNewCustPickup] = useState('');
  const [quickAddError, setQuickAddError] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Marketing attribution
  const [marketingCampaignId, setMarketingCampaignId] = useState<string>('');
  const [marketingChannelId, setMarketingChannelId] = useState<string>('');
  const [selectedDiscountCode, setSelectedDiscountCode] = useState<string>('');

  // Downpayment & Delivery
  const [hasDownPayment, setHasDownPayment] = useState<boolean>(true);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.status === 'active' && a.type !== 'حقوق ملكية');
    return defaultAcc?.id || 1;
  });

  const [formError, setFormError] = useState<string>('');

  if (!isOpen) return null;

  // Filter customers by search term
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const term = customerSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term))
    );
  });

  const handleApplyDiscountCode = (codeStr: string) => {
    setSelectedDiscountCode(codeStr);
    if (!codeStr) return;
    const foundCode = discountCodes.find(dc => dc.code.toLowerCase() === codeStr.toLowerCase());
    if (foundCode && foundCode.status === 'active') {
      if (foundCode.type === 'percentage') {
        const discVal = Math.round((subtotal * foundCode.value) / 100);
        setDiscount(discVal);
      } else {
        setDiscount(foundCode.value);
      }
    }
  };

  const total = Math.max(0, subtotal - discount + shippingFee);
  const remaining = Math.max(0, total - (hasDownPayment ? downPaymentAmount : 0));

  const handleQuickAddCustomer = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      setQuickAddError('يرجى كتابة اسم العميل الكامل');
      return;
    }
    if (!newCustPhone.trim()) {
      setQuickAddError('يرجى كتابة رقم هاتف العميل');
      return;
    }
    setQuickAddError('');

    const nextCodeNum = customers.length + 1;
    const autoCode = `TOP ${String(nextCodeNum).padStart(3, '0')}`;

    const newCustomer = addCustomer({
      code: autoCode,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      governorate: newCustGov.trim() || 'صنعاء',
      pickupLocation: newCustPickup.trim() || null,
      openingBalance: 0,
      status: 'active'
    });

    if (newCustomer?.id) {
      setCustomerId(newCustomer.id);
    }
    setShowQuickAddCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustPickup('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setFormError('يرجى اختيار العميل أولاً');
      return;
    }
    if (subtotal <= 0) {
      setFormError('يرجى تحديد قيمة الطلب الأصلية (المبلغ أكبر من صفر)');
      return;
    }
    setFormError('');

    const orderNumber = customerOrderCode.trim() || `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const selectedAcc = accounts.find(a => a.id === accountId);

    addOrder(
      {
        orderNumber,
        customerId,
        site,
        shipmentNumber: shipmentNumber.trim() || undefined,
        itemsCount: Number(itemsCount) || 1,
        subtotal: Number(subtotal) || 0,
        discount: Number(discount) || 0,
        shippingFee: Number(shippingFee) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        deliveryFeeCollectionStatus: 'unpaid',
        marketingCampaignId: marketingCampaignId ? Number(marketingCampaignId) : undefined,
        marketingChannelId: marketingChannelId ? Number(marketingChannelId) : undefined,
        discountCode: selectedDiscountCode.trim() || undefined,
        status: 'pending',
        orderDate: orderDate.trim() || new Date().toISOString().split('T')[0],
        notes: notes.trim() || undefined
      },
      hasDownPayment && downPaymentAmount > 0
        ? {
            amount: Number(downPaymentAmount),
            accountId,
            paymentMethod: selectedAcc?.name || 'محفظة'
          }
        : undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto touch-scroll" dir="rtl">
      <div className="bg-white rounded-3xl max-w-md sm:max-w-lg w-full shadow-2xl overflow-hidden my-3 sm:my-8 border border-slate-200">
        
        {/* Navy Header Bar - Matches User Screenshot */}
        <div className="bg-[#183661] text-white py-4 px-6 relative text-center shadow-xs">
          <h3 className="text-lg sm:text-xl font-bold tracking-wide">
            إضافة طلب جديد
          </h3>
          <button
            onClick={onClose}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto touch-scroll">
          
          {/* ========================================================= */}
          {/* SECTION 1: بيانات العميل والطلب (Card from Screenshot) */}
          {/* ========================================================= */}
          <div className="border border-[#e2d5c3] rounded-3xl p-4 sm:p-5 bg-white space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-[#183661] font-bold text-base sm:text-lg">
                بيانات العميل والطلب
              </h4>
            </div>

            {/* Field 1: العميل */}
            <div className="space-y-2">
              <label className="text-[#856934] font-bold block text-sm">العميل</label>
              
              {/* Row: Search Input + Add Customer Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddCustomer(!showQuickAddCustomer);
                    setQuickAddError('');
                  }}
                  className="px-4 py-3 rounded-2xl border border-[#d6c4a8] bg-white text-[#856934] font-bold hover:bg-[#fbf9f5] transition-colors cursor-pointer text-xs sm:text-sm whitespace-nowrap shadow-2xs"
                >
                  إضافة عميل
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="ابحث بالرقم أو الاسم أو الهاتف"
                    className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center sm:text-right font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Inline Quick Add Customer Form (Toggled when clicking "إضافة عميل") */}
              {showQuickAddCustomer && (
                <div className="p-3.5 bg-[#fbf9f5] border border-[#d6c4a8] rounded-2xl space-y-3 mt-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#d6c4a8]/60 pb-2">
                    <span className="font-bold text-[#183661] text-xs flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-[#856934]" />
                      <span>تسجيل عميل جديد واختياره فوراً</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddCustomer(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  {quickAddError && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 font-bold">
                      {quickAddError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] text-[#856934] font-bold block mb-1">اسم العميل *</label>
                      <input
                        type="text"
                        value={newCustName}
                        onChange={e => setNewCustName(e.target.value)}
                        placeholder="الاسم الرباعي"
                        className="w-full bg-white border border-[#d6c4a8] rounded-xl p-2 font-medium focus:ring-1 focus:ring-[#856934] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#856934] font-bold block mb-1">رقم الهاتف *</label>
                      <input
                        type="tel"
                        value={newCustPhone}
                        onChange={e => setNewCustPhone(e.target.value)}
                        placeholder="77XXXXXXX"
                        dir="ltr"
                        className="w-full bg-white border border-[#d6c4a8] rounded-xl p-2 font-mono text-right focus:ring-1 focus:ring-[#856934] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#856934] font-bold block mb-1">المحافظة</label>
                      <select
                        value={newCustGov}
                        onChange={e => setNewCustGov(e.target.value)}
                        className="w-full bg-white border border-[#d6c4a8] rounded-xl p-2 font-medium focus:outline-none"
                      >
                        <option value="صنعاء">صنعاء</option>
                        <option value="عدن">عدن</option>
                        <option value="تعز">تعز</option>
                        <option value="إب">إب</option>
                        <option value="الحديدة">الحديدة</option>
                        <option value="حضرموت">حضرموت</option>
                        <option value="مأرب">مأرب</option>
                        <option value="ذمار">ذمار</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#856934] font-bold block mb-1">مكان الاستلام / العنوان</label>
                      <input
                        type="text"
                        value={newCustPickup}
                        onChange={e => setNewCustPickup(e.target.value)}
                        placeholder="مثال: فرزة حدة"
                        className="w-full bg-white border border-[#d6c4a8] rounded-xl p-2 font-medium focus:ring-1 focus:ring-[#856934] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickAddCustomer}
                    className="w-full py-2.5 px-3 bg-[#183661] hover:bg-[#132c52] text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-[#d6c4a8]" />
                    <span>حفظ العميل وتحديده للطلب الآن</span>
                  </button>
                </div>
              )}

              {/* Dropdown: اختر العميل */}
              <div className="relative">
                <select
                  value={customerId}
                  onChange={e => setCustomerId(Number(e.target.value))}
                  className="w-full appearance-none border border-[#d6c4a8] rounded-2xl p-3 text-center font-bold text-[#183661] bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 cursor-pointer shadow-2xs pr-4 pl-10 text-xs sm:text-sm"
                  required
                >
                  <option value={0} disabled>اختر العميل</option>
                  {filteredCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - ({c.phone || c.code}) {c.governorate ? `[${c.governorate}]` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Selected Customer Quick Info Badge */}
              {(() => {
                const sel = customers.find(c => c.id === customerId);
                if (!sel) return null;
                return (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-[#fbf9f5] px-3 py-1.5 rounded-xl border border-[#d6c4a8]/50">
                    <span>الهاتف: <strong className="font-mono text-slate-800">{sel.phone || 'غير مسجل'}</strong></span>
                    <span>المحافظة: <strong className="text-slate-800">{sel.governorate}</strong></span>
                    <span>الكود: <strong className="font-mono text-[#856934]">{sel.code}</strong></span>
                  </div>
                );
              })()}
            </div>

            {/* Field 2: رقم طلب العميل */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">رقم طلب العميل</label>
              <input
                type="text"
                value={customerOrderCode}
                onChange={e => setCustomerOrderCode(e.target.value)}
                placeholder=""
                className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center sm:text-right font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
              />
            </div>

            {/* Field 3: رقم الشحنة (مشترك بين العملاء) */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">رقم الشحنة (مشترك بين العملاء)</label>
              <input
                type="text"
                value={shipmentNumber}
                onChange={e => setShipmentNumber(e.target.value)}
                placeholder=""
                className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center sm:text-right font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
              />
            </div>

            {/* Field 4: تاريخ الطلب */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">تاريخ الطلب</label>
              <div className="relative">
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs cursor-pointer text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Field 5: عدد القطع */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">عدد القطع</label>
              <input
                type="number"
                min="1"
                value={itemsCount}
                onChange={e => setItemsCount(Math.max(1, Number(e.target.value)))}
                className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
              />
            </div>

            {/* Field 6: طلب من موقع */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">طلب من موقع</label>
              <div className="relative">
                <select
                  value={site}
                  onChange={e => setSite(e.target.value)}
                  className="w-full appearance-none border border-[#d6c4a8] rounded-2xl p-3 text-center font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 cursor-pointer shadow-2xs pr-4 pl-10 text-xs sm:text-sm"
                >
                  <option value="SHEIN">SHEIN</option>
                  <option value="AliExpress">AliExpress</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Noon">Noon</option>
                  <option value="موقع آخر">موقع آخر</option>
                </select>
                <ChevronDown className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* SECTION 2: تفاصيل السعر (Card from Screenshot) */}
          {/* ========================================================= */}
          <div className="border border-[#e2d5c3] rounded-3xl p-4 sm:p-5 bg-white space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-[#183661] font-bold text-base sm:text-lg">
                تفاصيل السعر
              </h4>
            </div>

            {/* قيمة الطلب الأصلية */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">قيمة الطلب الأصلية *</label>
              <input
                type="number"
                min="0"
                value={subtotal || ''}
                onChange={e => setSubtotal(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
                required
              />
            </div>

            {/* الخصم (إن وجد) */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">الخصم (إن وجد)</label>
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={e => setDiscount(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
              />
            </div>

            {/* عمولة الوساطة / الشحن */}
            <div className="space-y-1">
              <label className="text-[#856934] font-bold block text-sm">عمولة الوساطة / الشحن</label>
              <input
                type="number"
                min="0"
                value={shippingFee || ''}
                onChange={e => setShippingFee(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-[#d6c4a8] rounded-2xl p-3 text-center font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#856934]/30 shadow-2xs text-xs sm:text-sm"
              />
            </div>

            {/* صندوق الإجمالي */}
            <div className="p-3.5 bg-[#fbf9f5] border border-[#d6c4a8] rounded-2xl flex items-center justify-between font-bold text-sm">
              <span className="text-[#183661]">إجمالي قيمة الطلب:</span>
              <span className="font-mono text-base text-[#183661] font-bold">
                {total.toLocaleString()} ريال
              </span>
            </div>

            {/* Downpayment Section */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs sm:text-sm">
                  <input
                    type="checkbox"
                    checked={hasDownPayment}
                    onChange={e => setHasDownPayment(e.target.checked)}
                    className="w-4 h-4 rounded text-[#183661] focus:ring-[#183661]"
                  />
                  <span>تسجيل دفعة أولى (مقدم) الآن</span>
                </label>
                {hasDownPayment && (
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                    سند قبض آلي
                  </span>
                )}
              </div>

              {hasDownPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div>
                    <label className="text-[#856934] font-bold block mb-1">مبلغ الدفعة الأولى</label>
                    <input
                      type="number"
                      min="0"
                      max={total}
                      value={downPaymentAmount || ''}
                      onChange={e => setDownPaymentAmount(Number(e.target.value))}
                      placeholder="المبلغ المدفوع"
                      className="w-full border border-[#d6c4a8] rounded-xl p-2.5 bg-white font-mono font-bold text-emerald-800 text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[#856934] font-bold block mb-1">الحساب المستلم</label>
                    <select
                      value={accountId}
                      onChange={e => setAccountId(Number(e.target.value))}
                      className="w-full border border-[#d6c4a8] rounded-xl p-2.5 bg-white font-medium text-center"
                    >
                      {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-600 font-bold">المتبقي على العميل:</span>
                <span className="font-mono font-bold text-[#856934] text-sm">
                  {remaining.toLocaleString()} ريال
                </span>
              </div>
            </div>

            {/* رسوم التوصيل وملاحظات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[#856934] font-bold block mb-1 text-xs">رسوم التوصيل الداخلي</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={e => setDeliveryFee(Number(e.target.value))}
                  className="w-full border border-[#d6c4a8] rounded-xl p-2.5 font-mono text-center text-xs"
                />
              </div>

              <div>
                <label className="text-[#856934] font-bold block mb-1 text-xs">ملاحظات الطلب</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="مقاسات، تفاصيل خاصة..."
                  className="w-full border border-[#d6c4a8] rounded-xl p-2.5 text-xs text-center sm:text-right"
                />
              </div>
            </div>

            {/* Marketing & Discount Codes */}
            <div className="p-3 bg-[#fbf9f5] border border-[#d6c4a8]/70 rounded-2xl space-y-2 text-xs">
              <span className="font-bold text-[#183661] text-xs block">كود الخصم والحملة (اختياري)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedDiscountCode}
                  onChange={e => handleApplyDiscountCode(e.target.value)}
                  className="w-full border border-[#d6c4a8] rounded-xl p-2 bg-white font-mono text-center"
                >
                  <option value="">بدون كود خصم</option>
                  {discountCodes.map(dc => (
                    <option key={dc.id} value={dc.code}>
                      كود: {dc.code} ({dc.type === 'percentage' ? `${dc.value}%` : `${dc.value} ريال`})
                    </option>
                  ))}
                </select>

                <select
                  value={marketingCampaignId}
                  onChange={e => setMarketingCampaignId(e.target.value)}
                  className="w-full border border-[#d6c4a8] rounded-xl p-2 bg-white text-center"
                >
                  <option value="">بدون حملة تسويقية</option>
                  {marketingCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold text-center">
              {formError}
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 rounded-2xl bg-[#183661] hover:bg-[#132c52] text-white font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 text-[#d6c4a8]" />
              <span>حفظ الطلب</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-5 rounded-2xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-sm transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
