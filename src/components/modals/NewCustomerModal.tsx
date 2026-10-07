import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ isOpen, onClose }) => {
  const { customers, addCustomer, settings } = useStore();

  const nextCodeNum = customers.length + 1;
  const autoCode = `TOP ${String(nextCodeNum).padStart(3, '0')}`;

  const [code, setCode] = useState(autoCode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('صنعاء');
  const [pickupLocation, setPickupLocation] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم العميل');
      return;
    }
    if (!phone.trim()) {
      setFormError('يرجى إدخال رقم هاتف العميل');
      return;
    }
    setFormError('');

    addCustomer({
      code: code.trim(),
      name: name.trim(),
      phone: phone.trim(),
      governorate: governorate.trim(),
      pickupLocation: pickupLocation.trim() || null,
      openingBalance: Number(openingBalance) || 0,
      notes: notes.trim() || null,
      status: 'active'
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 my-8">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إضافة عميل جديد</h3>
              <p className="text-xs text-slate-500">تسجيل بيانات العميل ومكان الاستلام المفضل في اليمن</p>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">كود العميل *</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">اسم العميل الكامل *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="الاسم الثلاثي أو الرباعي"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">رقم الهاتف *</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="مثال: 772791991"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">المحافظة</label>
              <select
                value={governorate}
                onChange={e => setGovernorate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-medium"
              >
                <option value="صنعاء">صنعاء</option>
                <option value="المحويت">المحويت</option>
                <option value="مارب">مارب</option>
                <option value="البيضاء">البيضاء</option>
                <option value="الحديدة">الحديدة</option>
                <option value="عدن">عدن</option>
                <option value="تعز">تعز</option>
                <option value="إب">إب</option>
                <option value="ذمار">ذمار</option>
                <option value="حجة">حجة</option>
                <option value="حضرموت">حضرموت</option>
                <option value="أخرى">محافظة أخرى</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">مكان الاستلام المفضل / نقطة التوصيل</label>
            <input
              type="text"
              value={pickupLocation}
              onChange={e => setPickupLocation(e.target.value)}
              placeholder="مثال: عصر، شارع تونس، فرزة البيضاء، ارسال عبر القدسي..."
              className="w-full border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">الرصيد الافتتاحي (إن وجد مديونية سابقة)</label>
              <input
                type="number"
                min="0"
                value={openingBalance || ''}
                onChange={e => setOpeningBalance(Number(e.target.value))}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg p-2.5 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">ملاحظات العميل</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="حساب فرعي، تواصل خاص..."
                className="w-full border border-slate-200 rounded-lg p-2.5"
              />
            </div>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold">
              {formError}
            </div>
          )}

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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
            >
              حفظ العميل
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
