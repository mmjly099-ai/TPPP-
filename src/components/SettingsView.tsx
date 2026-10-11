import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Building,
  Phone,
  CreditCard,
  Tag,
  PenTool,
  Trash2,
  Smartphone
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SignaturePad } from './common/SignaturePad';
import { PWAInstallButton } from './common/PWAInstallButton';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSetting,
    clearAllData,
    resetToBackup,
    restoreCompleteInitialData,
    purgeAllDataToEmpty,
    downloadBackupFile,
    importBackup,
    customers,
    orders,
    accounts,
    journalEntries,
    expenses
  } = useStore();

  const [formState, setFormState] = useState({
    storeName: settings.storeName || 'TOP STORE – توب ستور',
    businessName: settings.businessName || 'وسيط شراء وتسوق إلكتروني',
    managerName: settings.managerName || 'مالك مجلي',
    phone: settings.phone || '772791991',
    whatsapp: settings.whatsapp || '784960100',
    address: settings.address || 'صنعاء ـ عصر ـ جوار جامعة سبأ',
    currency: settings.currency || 'الريال اليمني',
    currencySymbol: settings.currencySymbol || 'ريال',
    purchaseSites: settings.purchaseSites || 'SHEIN، AliExpress، موقع آخر',
    defaultPurchaseAccount: settings.defaultPurchaseAccount || 'VISA CARDبنك التضامن +VISA CARD البنك التجاري',
    expenseCategories: settings.expenseCategories || 'تسويق، إنترنت، مواصلات، رواتب، تشغيل، رسوم بنكية، رسوم تحويل، إيجار، صيانة، أخرى'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [backupStatusMsg, setBackupStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    Object.entries(formState).forEach(([key, val]) => {
      updateSetting(key, val);
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleExport = () => {
    const res = downloadBackupFile();
    setDownloadSuccessMsg(`تم تنزيل ملف النسخة الاحتياطية (${res.filename} - ${res.sizeKb} كيلوبايت) بنجاح.`);
    setTimeout(() => setDownloadSuccessMsg(null), 5000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const res = importBackup(content);
      setBackupStatusMsg({
        type: res.success ? 'success' : 'error',
        text: res.message
      });
      setTimeout(() => setBackupStatusMsg(null), 6000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">إعدادات متجر توب ستور</h2>
        <p className="text-xs text-slate-500">
          تخصيص بيانات المتجر، أرقام التواصل، العملة، مواقع الشراء والنسخ الاحتياطي
        </p>
      </div>

      {/* PWA App Installation Card */}
      <PWAInstallButton variant="banner" />

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تم حفظ التغييرات بنجاح!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        
        {/* Section 1: Basic Identity */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-amber-600" />
            <span>بيانات المنشأة والهوية</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">اسم المتجر</label>
              <input
                type="text"
                value={formState.storeName}
                onChange={e => setFormState({ ...formState, storeName: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">النشاط التجاري</label>
              <input
                type="text"
                value={formState.businessName}
                onChange={e => setFormState({ ...formState, businessName: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">اسم المدير العام</label>
              <input
                type="text"
                value={formState.managerName}
                onChange={e => setFormState({ ...formState, managerName: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>بيانات التواصل والموقع في صنعاء</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={formState.phone}
                onChange={e => setFormState({ ...formState, phone: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">رقم الواتساب</label>
              <input
                type="text"
                value={formState.whatsapp}
                onChange={e => setFormState({ ...formState, whatsapp: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg p-2.5"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">العنوان</label>
              <input
                type="text"
                value={formState.address}
                onChange={e => setFormState({ ...formState, address: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Purchasing & Accounting Configuration */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>إعدادات الشراء والمواقع والعملة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">مواقع الشراء المدعومة</label>
              <input
                type="text"
                value={formState.purchaseSites}
                onChange={e => setFormState({ ...formState, purchaseSites: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">حساب الشراء الافتراضي للبطاقات</label>
              <input
                type="text"
                value={formState.defaultPurchaseAccount}
                onChange={e => setFormState({ ...formState, defaultPurchaseAccount: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">اسم العملة ورمزها</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formState.currency}
                  onChange={e => setFormState({ ...formState, currency: e.target.value })}
                  className="w-2/3 text-xs border border-slate-200 rounded-lg p-2.5"
                />
                <input
                  type="text"
                  value={formState.currencySymbol}
                  onChange={e => setFormState({ ...formState, currencySymbol: e.target.value })}
                  className="w-1/3 text-xs border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">تصنيفات المصاريف</label>
              <input
                type="text"
                value={formState.expenseCategories}
                onChange={e => setFormState({ ...formState, expenseCategories: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ التغييرات</span>
          </button>
        </div>
      </form>

      {/* Section: Authorized Financial Signature (التوقيع المالي المعتمد للمتجر) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PenTool className="w-4 h-4 text-[#112952]" />
              <span>التوقيع المالي المعتمد للمتجر والفواتير</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              وقّع بيدك هنا ليتم وضع توقيعك تلقائياً في خانة الاعتماد بجميع الفواتير، سندات القبض، وكشوفات الحساب.
            </p>
          </div>
          {settings.authorizedSignature && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>يوجد توقيع معتمد مفعّل</span>
            </span>
          )}
        </div>

        <SignaturePad
          initialSignature={settings.authorizedSignature || settings.signature}
          onSave={(dataUrl) => {
            updateSetting('authorizedSignature', dataUrl);
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);
          }}
          onClear={() => {
            updateSetting('authorizedSignature', '');
          }}
        />
      </div>

      {/* Backup & System Maintenance Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">إدارة النسخ الاحتياطي وتصدير البيانات</h3>
          <p className="text-xs text-slate-500">
            تصدير الحالة الحالية للتطبيق بالكامل (العملاء: {customers.length}، الطلبيات: {orders.length}، الحسابات: {accounts.length}) كملف JSON محلي لحفظها أو نقلها
          </p>
        </div>

        {downloadSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccessMsg}</span>
          </div>
        )}

        {backupStatusMsg && (
          <div className={`p-3 border rounded-xl text-xs font-bold flex items-center gap-2 ${
            backupStatusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{backupStatusMsg.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية (JSON)</span>
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>استيراد ملف احتياطي</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (confirm('هل أنت متأكد من رغبتك في استعادة وتثبيت كافة بيانات النظام والمحاسبة بالكامل (43 عميل، 49 طلبية، 139 مصروف، 318 قيد يومية)؟')) {
                restoreCompleteInitialData();
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold transition-colors cursor-pointer mr-auto shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة وتثبيت بيانات النظام الشاملة</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: مسح وتصفير كافة البيانات */}
      <div className="bg-rose-50/70 rounded-2xl border-2 border-rose-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rose-200/80 gap-3">
          <div>
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>منطقة العمليات الحساسة: حذف وتصفير كافة الحركات والبيانات</span>
            </h3>
            <p className="text-xs text-rose-700 mt-1">
              تصفير كافة سجلات العملاء، الطلبات، المصروفات، والقيود للبدء من الصفر بقاعدة بيانات فارغة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('تحذير نهائي: هل أنت متأكد من تصفير كافة الحركات والطلبات والقيود بالكامل؟')) {
                purgeAllDataToEmpty();
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>تصفير الحركات والبيانات</span>
          </button>
        </div>
        <div className="text-[11px] text-rose-700 font-medium">
          الحالة الحالية للنظام: {customers.length} عميل مسجل | {orders.length} طلبية | {expenses.length} مصروف | {journalEntries.length} قيد يومية محاسبي | {accounts.length} حساب وخزينة مالية.
        </div>
      </div>

    </div>
  );
};
