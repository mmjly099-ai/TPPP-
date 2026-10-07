import React, { useState } from 'react';
import { X, Receipt, Tag, Building, Wallet } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose }) => {
  const { accounts, addExpense, settings, marketingCampaigns } = useStore();

  const categories = (settings.expenseCategories || 'تسويق، إنترنت، مواصلات، رواتب، تشغيل، رسوم بنكية، رسوم تحويل، إيجار، صيانة، أخرى')
    .split('،')
    .map(c => c.trim());

  const [category, setCategory] = useState<string>(categories[0] || 'تشغيل');
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
          
          {/* Category & Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">تصنيف المصروف *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
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
              <label className="font-bold text-slate-700 block mb-1">المستفيد / الجهة (اختياري)</label>
              <input
                type="text"
                value={vendorName}
                onChange={e => setVendorName(e.target.value)}
                placeholder="مثال: فيسبوك، يمن نت، شركة النقل..."
                className="w-full border border-slate-200 rounded-lg p-2.5"
              />
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
