import React, { useState } from 'react';
import { X, Receipt, Tag, Building, Wallet } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addExpense, settings, marketingCampaigns } = useStore();

  const rawCats = (settings.expenseCategories || 'قات، عشاء، تشغيل، إنترنت، مواصلات، رواتب، تسويق، شحن ونقل لوجستي، مصاريف عمال، رسوم بنكية، رسوم تحويل، إيجار، صيانة، أخرى')
    .split('،')
    .map(c => c.trim())
    .filter(Boolean);

  const categories = Array.from(new Set(['قات', 'عشاء', ...rawCats]));

  const [category, setCategory] = useState<string>('قات');
  const [vendorName, setVendorName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [campaignId, setCampaignId] = useState<string>('');
  const [accountId, setAccountId] = useState<number>(() => {
    const defaultAcc = accounts.find(a => a.name.includes('جيب')) || accounts[0];
    return defaultAcc ? defaultAcc.id : 1;
  });
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  const quickCategories = [
    { label: 'قات', emoji: '🌿', defaultDesc: 'قات' },
    { label: 'عشاء', emoji: '🍽️', defaultDesc: 'عشاء' },
    { label: 'تشغيل', emoji: '⚡', defaultDesc: 'مصروف تشغيل' },
    { label: 'إنترنت', emoji: '🌐', defaultDesc: 'باقة نت' },
    { label: 'مواصلات', emoji: '🚗', defaultDesc: 'مواصلات وتوصيل' },
    { label: 'مصاريف عمال', emoji: '👷', defaultDesc: 'صرفية عمال' }
  ];

  const handleSelectQuickCategory = (qc: typeof quickCategories[0]) => {
    setCategory(qc.label);
    if (!description.trim() || quickCategories.some(c => c.defaultDesc === description.trim())) {
      setDescription(qc.defaultDesc);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFormError('يرجى كتابة بيان المصروف');
      return;
    }
    if (amount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    setFormError('');

    addExpense({
      category,
      vendorName: vendorName.trim() || undefined,
      description: description.trim(),
      amount: Number(amount),
      accountId,
      campaignId: campaignId ? Number(campaignId) : undefined,
      notes: notes.trim() || undefined
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تسجيل مصروف تشغيلي جديد</h3>
              <p className="text-xs text-slate-500">خصم المصروف من المحفظة وإثبات قيد اليومية آلياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Quick Choice Buttons for Priority Categories */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">اختيار سريع للتصنيف:</label>
            <div className="flex flex-wrap gap-1.5">
              {quickCategories.map(qc => {
                const isSelected = category === qc.label;
                return (
                  <button
                    key={qc.label}
                    type="button"
                    onClick={() => handleSelectQuickCategory(qc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? qc.label === 'قات'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : qc.label === 'عشاء'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{qc.emoji}</span>
                    <span>{qc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تصنيف المصروف *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'قات' ? '🌿 قات (الصنف الأول)' : cat === 'عشاء' ? '🍽️ عشاء (الصنف الثاني)' : cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الحملة التسويقية (إن وجد)</label>
              <select
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white"
              >
                <option value="">بدون ربط بحملة إعلانية</option>
                {marketingCampaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.platform})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المستفيد / العامل / الجهة:</label>
              <input
                type="text"
                value={vendorName}
                onChange={e => setVendorName(e.target.value)}
                placeholder="مثال: محمد طه، عبد الرحمن، المقوت، يمن نت..."
                className="w-full border border-slate-200 rounded-lg p-2.5"
              />
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold">اختيار عامل:</span>
                {['محمد طه', 'عبد الرحمن', 'مالك', 'معتز'].map(wName => (
                  <button
                    key={wName}
                    type="button"
                    onClick={() => {
                      setVendorName(wName);
                      if (!description || description === 'قات' || description === 'عشاء' || description === 'صرفية عمال') {
                        setDescription(`${category} لـ ${wName}`);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      vendorName === wName
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    👷 {wName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">بيان وتفاصيل المصروف *</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="مثال: تجديد باقة إنترنت المكتب، مواصلات توصيل، إلخ..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
              required
            />
          </div>

          {/* Amount & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">المبلغ (ريال) *</label>
              <input
                type="number"
                min="1"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-rose-600 text-sm"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الحساب الدافع (خصم من) *</label>
              <select
                value={accountId}
                onChange={e => setAccountId(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
                required
              >
                {accounts.filter(a => a.status === 'active' && a.type !== 'حقوق ملكية').map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="رقم الفاتورة، أو أي تفاصيل أخرى..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
            >
              تسجيل وخصم المصروف
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
