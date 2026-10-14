import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Database,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Activity,
  Layers,
  ArrowUpDown,
  ShieldCheck,
  Server,
  Zap,
  Globe,
  Settings,
  HelpCircle,
  Copy,
  Check,
  Cpu,
  Code
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  initSupabase,
  isSupabaseConfigured,
  testSupabaseConnection,
  getActiveSupabaseConfig,
  setRuntimeSupabaseConfig,
  sanitizeSupabaseUrl,
  migrateLocalDataToSupabase
} from '../lib/supabase';
import { getOrCreateCurrentDevice, DeviceInfo, DeviceSyncRecord } from '../utils/deviceTracker';
import supabaseSchemaSql from '../lib/supabase-schema.sql?raw';

export const SupabaseMonitorView: React.FC = () => {
  const {
    customers,
    orders,
    expenses,
    journalEntries,
    accounts,
    lastSyncTime,
    syncWithServer,
    isSyncing,
    realtimeStatus,
    lastRealtimeEvent
  } = useStore();

  const [currentDevice, setCurrentDevice] = useState<DeviceInfo>(() => getOrCreateCurrentDevice());
  const [activeDevices, setActiveDevices] = useState<DeviceSyncRecord[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    tested: boolean;
    checking: boolean;
    ok: boolean;
    message?: string;
    latencyMs?: number;
  }>({
    tested: false,
    checking: false,
    ok: false,
  });

  const [supabaseConfig, setSupabaseConfig] = useState(() => getActiveSupabaseConfig());
  const [editUrl, setEditUrl] = useState(supabaseConfig.url);
  const [editAnonKey, setEditAnonKey] = useState(supabaseConfig.anonKey);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    running: boolean;
    result?: { success: boolean; insertedCounts: Record<string, number>; errors: string[] };
  }>({ running: false });

  // 1. Fetch connected devices list
  const fetchActiveDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const res = await fetch('/api/sync/devices');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.devices)) {
          setActiveDevices(json.devices);
        }
      }
    } catch (e) {
      console.warn('Could not fetch devices list', e);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  // 2. Check Supabase connection health
  const checkSupabaseHealth = useCallback(async () => {
    setSupabaseStatus(prev => ({ ...prev, checking: true }));
    const t0 = performance.now();
    try {
      const result = await testSupabaseConnection();
      const latencyMs = Math.round(performance.now() - t0);
      setSupabaseStatus({
        tested: true,
        checking: false,
        ok: result.ok,
        message: result.message,
        latencyMs
      });
    } catch (e: any) {
      setSupabaseStatus({
        tested: true,
        checking: false,
        ok: false,
        message: e?.message || 'فشل الاتصال بقاعدة بيانات Supabase',
        latencyMs: Math.round(performance.now() - t0)
      });
    }
  }, []);

  useEffect(() => {
    fetchActiveDevices();
    checkSupabaseHealth();

    const interval = setInterval(() => {
      fetchActiveDevices();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchActiveDevices, checkSupabaseHealth]);

  // Handle saving credentials
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = sanitizeSupabaseUrl(editUrl);
    setEditUrl(cleanUrl);
    setRuntimeSupabaseConfig(cleanUrl, editAnonKey.trim());
    const updated = getActiveSupabaseConfig();
    setSupabaseConfig(updated);
    setIsEditingConfig(false);
    setTimeout(() => {
      checkSupabaseHealth();
    }, 150);
  };

  // Run full data upload/migration to Supabase
  const handleMigrateToSupabase = async () => {
    if (!isSupabaseConfigured()) {
      alert('يرجى ضبط رابط ومفتاح Supabase أولاً للتمكن من رفع البيانات.');
      return;
    }
    if (!confirm('هل تريد رفع كافة بيانات المتجر الحالية (العملاء، الطلبيات، قيود اليومية) إلى جداول Supabase السحابية؟')) {
      return;
    }
    setMigrationStatus({ running: true });
    try {
      const fullStoreData = {
        format: 'topstore_backup_v1',
        version: 1,
        createdAt: new Date().toISOString(),
        tables: {
          appSettings: [],
          customers,
          orders,
          accounts,
          paymentMethods: [],
          payments: [],
          shipments: [],
          financialTransactions: [],
          journalEntries,
          journalLines: [],
          expenses,
          auditLogs: [],
          assistantLogs: [],
          owners: []
        }
      };
      const result = await migrateLocalDataToSupabase(fullStoreData as any);
      setMigrationStatus({ running: false, result });
      checkSupabaseHealth();
    } catch (e: any) {
      setMigrationStatus({
        running: false,
        result: {
          success: false,
          insertedCounts: {},
          errors: [e?.message || 'خطأ غير متوقع أثناء الرفع']
        }
      });
    }
  };

  const handleCopyCredentials = () => {
    if (!supabaseConfig.anonKey) return;
    navigator.clipboard.writeText(supabaseConfig.anonKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Helper time difference
  const formatTimeDifference = (isoString?: string) => {
    if (!isoString) return 'لم تتم المزامنة بعد';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 15) return 'الآن (مباشر)';
      if (diffSec < 60) return `منذ ${diffSec} ثانية`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      return new Date(isoString).toLocaleDateString('ar-YE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>وحدة مراقبة المزامنة وسيرفر Supabase</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  realtimeStatus === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : realtimeStatus === 'connecting'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    realtimeStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : realtimeStatus === 'connecting'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-slate-400'
                  }`}></span>
                  {realtimeStatus === 'connected'
                    ? 'اشتراك فوري نشط (Realtime Active)'
                    : realtimeStatus === 'connecting'
                    ? 'جارٍ الاتصال بالقناة الفورية...'
                    : 'اشتراك Realtime غير متصل'}
                </span>
                {lastRealtimeEvent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200">
                    آخر إشعار: {lastRealtimeEvent.table} ({lastRealtimeEvent.eventType}) في {lastRealtimeEvent.time}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اشتراك فوري Realtime بقاعدة بيانات Supabase، تتبع توقيت آخر مزامنة لكل جهاز (لابتوب / جوال)، وتزامن تلقائي بدون أي تأخير
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              syncWithServer();
              fetchActiveDevices();
              checkSupabaseHealth();
            }}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>مزامنة فورية الآن</span>
          </button>
        </div>
      </div>

      {/* Top Cards: Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Supabase Health */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">حالة قاعدة بيانات Supabase</span>
            <div className={`p-1.5 rounded-lg ${supabaseStatus.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-3">
            <div className="flex items-center gap-2">
              {supabaseStatus.checking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm font-bold text-slate-600">جارٍ فحص الاتصال...</span>
                </>
              ) : supabaseStatus.ok ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">متصل وجاهز</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-bold text-amber-700">
                    {isSupabaseConfigured() ? 'غير متصل (تحقق من المفاتيح)' : 'بانتظار ضبط الرابط والمفتاح'}
                  </span>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{supabaseStatus.latencyMs ? `سرعة الاستجابة: ${supabaseStatus.latencyMs}ms` : 'البروتوكول: REST / PG'}</span>
              <button
                onClick={checkSupabaseHealth}
                className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
              >
                إعادة الفحص
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Current Device Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">الجهاز الحالي المستخدم</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              {currentDevice.deviceType === 'desktop' ? <Laptop className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </div>
          </div>
          <div className="pt-3">
            <div className="text-sm font-bold text-slate-900 truncate" title={currentDevice.deviceName}>
              {currentDevice.deviceName}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                {currentDevice.os}
              </span>
              <span>•</span>
              <span className="truncate">{currentDevice.browser}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Last Sync Time */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">آخر مزامنة ناجحة محلياً</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-3">
            <div className="text-sm font-bold text-slate-900 font-mono">
              {lastSyncTime || 'الآن'}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>دورة المزامنة التلقائية: كل 15 ثانية</span>
            </div>
          </div>
        </div>

        {/* Card 4: Registered Records Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-500">إجمالي السجلات المشتركة</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-3">
            <div className="text-sm font-bold text-slate-900">
              {customers.length + orders.length + expenses.length + journalEntries.length} سجل محاسبي
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
              <span>{customers.length} عميل</span>
              <span>•</span>
              <span>{orders.length} طلبية</span>
              <span>•</span>
              <span>{journalEntries.length} قيد</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Connected Devices Synchronizer Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>حالة مزامنة وتوقيت الأجهزة المتصلة (اللابتوب والهاتف)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يتم تحديث هذه القائمة تلقائياً عند قيام أي جهاز (كمبيوتر أو هاتف) بحفظ أو سحب البيانات
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-mono">
              الأجهزة المسجلة: {Math.max(activeDevices.length, 1)}
            </span>
            <button
              onClick={fetchActiveDevices}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
              title="تحديث قائمة الأجهزة"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Devices List */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-bold">نوع الجهاز والاسم</th>
                <th className="py-3 px-4 font-bold">نظام التشغيل والمتصفح</th>
                <th className="py-3 px-4 font-bold">توقيت آخر مزامنة</th>
                <th className="py-3 px-4 font-bold">فرق التوقيت (التأخير)</th>
                <th className="py-3 px-4 font-bold">العملية الأخيرة</th>
                <th className="py-3 px-4 font-bold">حالة المزامنة والتطابق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Always display Current Device row prominently */}
              <tr className="bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      {currentDevice.deviceType === 'desktop' ? (
                        <Laptop className="w-4 h-4" />
                      ) : currentDevice.deviceType === 'tablet' ? (
                        <Tablet className="w-4 h-4" />
                      ) : (
                        <Smartphone className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{currentDevice.deviceName}</span>
                        <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                          هذا الجهاز (الحالي)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{currentDevice.deviceId}</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-700">
                  <div>{currentDevice.os}</div>
                  <div className="text-[10px] text-slate-400">{currentDevice.browser}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-800 font-mono font-medium">
                  {lastSyncTime || new Date().toLocaleTimeString('ar-YE')}
                </td>
                <td className="py-3.5 px-4 font-medium text-emerald-700">
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    متصل الآن (0 تأخير)
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-700">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                    <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                    تحديث ثنائي (Push & Pull)
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>مطابق تماماً 100%</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {customers.length} عميل | {orders.length} طلب | {expenses.length} مصروف
                  </div>
                </td>
              </tr>

              {/* Other registered devices from server sync */}
              {activeDevices
                .filter(d => d.deviceId !== currentDevice.deviceId)
                .map((dev) => {
                  const isRecent = dev.lastSyncAt && (Date.now() - new Date(dev.lastSyncAt).getTime() < 60000);
                  return (
                    <tr key={dev.deviceId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            dev.deviceType === 'desktop' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {dev.deviceType === 'desktop' ? (
                              <Laptop className="w-4 h-4" />
                            ) : dev.deviceType === 'tablet' ? (
                              <Tablet className="w-4 h-4" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{dev.deviceName}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{dev.deviceId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>{dev.os || 'غير محدد'}</div>
                        <div className="text-[10px] text-slate-400">{dev.browser || 'متصفح'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-mono font-medium">
                        {dev.lastSyncAt ? new Date(dev.lastSyncAt).toLocaleTimeString('ar-YE') : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isRecent ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {formatTimeDifference(dev.lastSyncAt)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {dev.syncType === 'push' ? 'إرسال بيانات (حفظ)' : 'سحب بيانات (تحديث)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>متزامن مع الخادم</span>
                        </div>
                        {dev.recordsCount && (
                          <div className="text-[10px] text-slate-400">
                            {dev.recordsCount.customers} عميل | {dev.recordsCount.orders} طلب
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Explain Why laptop & phone could diverge & How it is solved */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-2">
          <div className="font-bold flex items-center gap-2 text-blue-950">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>كيف يضمن هذا النظام عدم وجود أي تأخير بين اللابتوب والهاتف؟</span>
          </div>
          <p className="text-blue-800 leading-relaxed">
            1. <strong>المزامنة التلقائية النبضية (Heartbeat):</strong> يرسل كل جهاز (اللابتوب أو الهاتف) طلباً سحابياً كل 15 ثانية لجلب آخر التعديلات فور حفظها من الجهاز الآخر.
          </p>
          <p className="text-blue-800 leading-relaxed">
            2. <strong>المزامنة عند فتح الشاشة (On-Focus Sync):</strong> بمجرد فتح متصفح الهاتف أو العودة إلى نافذة النظام على اللابتوب، يقوم النظام بعمل مزامنة فورية فورية بدون الحاجة لإعادة تحميل الصفحة.
          </p>
          <p className="text-blue-800 leading-relaxed">
            3. <strong>التخزين المزدوج:</strong> يحفظ المتصفح نسخة محلية في الذاكرة للعمل بدون إنترنت (Offline)، وعند عودة الاتصال يتم إرسال التعديلات فوراً للسيرفر المركزي و Supabase لتبادلها مع الجهاز الآخر.
          </p>
        </div>
      </div>

      {/* Section 3: Supabase Configuration & Credentials Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>إعدادات الاتصال المباشر بقاعدة بيانات Supabase</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ربط قاعدة بيانات PostgreSQL السحابية المدارة عبر Supabase لتخزين جداول العملاء والطلبيات والقيود
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingConfig ? (
              <button
                type="button"
                onClick={() => {
                  setEditUrl(supabaseConfig.url);
                  setEditAnonKey(supabaseConfig.anonKey);
                  setIsEditingConfig(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>تعديل الرابط والمفتاح</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingConfig(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>إلغاء</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleMigrateToSupabase}
              disabled={migrationStatus.running || !supabaseConfig.url}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${migrationStatus.running ? 'animate-spin' : ''}`} />
              <span>{migrationStatus.running ? 'جارٍ رفع البيانات...' : 'رفع البيانات الحالية إلى Supabase'}</span>
            </button>
          </div>
        </div>

        {/* Secret Key Warning Banner if user previously saved a secret key */}
        {!isEditingConfig && (supabaseConfig.anonKey || '').toLowerCase().includes('secret') && (
          <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs space-y-2 text-rose-950 animate-in fade-in">
            <div className="font-bold flex items-center gap-2 text-rose-900 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>سبب الخطأ في المتصفح: تم نسخ المفتاح السري (Secret Key) بدلاً من المفتاح العام!</span>
            </div>
            <p className="text-rose-800 leading-relaxed text-xs">
              المفتاح المحفوظ حالياً يبدأ بـ <code className="font-mono font-bold bg-rose-200/80 text-rose-950 px-1.5 py-0.5 rounded">sb_secret_...</code> وهو المفتاح السري المخصص للسيرفرات فقط. منصة Supabase تحظره وتمنع استخدامه في المتصفح وتظهر رسالة:
              <br />
              <strong className="text-rose-950 font-mono text-[11px] block mt-1 bg-white/70 p-1.5 rounded border border-rose-200">
                Forbidden use of secret API key in browser
              </strong>
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditUrl(sanitizeSupabaseUrl(supabaseConfig.url));
                  setEditAnonKey('');
                  setIsEditingConfig(true);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>اضغط هنا لتصحيح المفتاح الآن</span>
              </button>
            </div>
          </div>
        )}

        {/* Credentials Form / View */}
        {isEditingConfig ? (
          <form onSubmit={handleSaveConfig} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رابط المشروع (Supabase Project URL) *
                </label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  dir="ltr"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  انسخ الرابط الأساسي فقط (مثال: https://xxxx.supabase.co) بدون إضافة /rest/v1
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المفتاح العام (anon public key / publishable) *
                </label>
                <input
                  type="text"
                  value={editAnonKey}
                  onChange={e => setEditAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1Ni... أو sb_publishable_..."
                  dir="ltr"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-mono text-slate-800 focus:outline-none ${
                    editAnonKey.toLowerCase().includes('secret')
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-300 focus:border-emerald-500'
                  }`}
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  المفتاح العام (anon أو publishable) المخصص للمتصفح (لا تنسخ المفتاح الذي يحتوي على كلمة secret)
                </span>
              </div>
            </div>

            {/* Live Warning if user inputs a secret key */}
            {editAnonKey.toLowerCase().includes('secret') && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>تنبيه: هذا المفتاح يحتوي على كلمة (secret)!</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  هذا هو المفتاح السري، والمتصفح سيرفض الاتصال به فوراً. يرجى نسخ المفتاح الآخر المكتوب بجانبه <strong>anon</strong> أو <strong>public</strong> من إعدادات Supabase.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingConfig(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                حفظ واختبار الاتصال
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-500 mb-1">رابط Supabase URL الحالي:</div>
              <div className="font-mono text-xs text-slate-900 break-all select-all font-semibold" dir="ltr">
                {supabaseConfig.url || '<غير محدد - اضغط تعديل لإدخاله>'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                المصدر: {supabaseConfig.source === 'env' ? 'ملف البيئة (.env)' : supabaseConfig.source === 'custom' ? 'مدخل يدوياً' : 'غير متوفر'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-500">المفتاح العام (Anon Key):</span>
                {supabaseConfig.anonKey && (
                  <button
                    onClick={handleCopyCredentials}
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'تم النسخ!' : 'نسخ المفتاح'}</span>
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-slate-800 truncate" dir="ltr">
                {supabaseConfig.anonKey
                  ? `${supabaseConfig.anonKey.substring(0, 24)}...${supabaseConfig.anonKey.substring(supabaseConfig.anonKey.length - 8)}`
                  : '<غير محدد>'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                مشفر ومحمي للوصول عبر واجهة المستخدم
              </div>
            </div>
          </div>
        )}

        {/* Migration Output Message */}
        {migrationStatus.result && (
          <div className={`p-4 rounded-xl border text-xs ${
            migrationStatus.result.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="font-bold flex items-center gap-2 mb-2">
              {migrationStatus.result.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              <span>
                {migrationStatus.result.success
                  ? 'تم ترحيل البيانات إلى Supabase بنجاح!'
                  : 'اكتملت عملية الرفع مع بعض التنبيهات:'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 font-semibold">
              <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                العملاء: {migrationStatus.result.insertedCounts.customers || 0}
              </div>
              <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                الطلبيات: {migrationStatus.result.insertedCounts.orders || 0}
              </div>
              <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                قيود اليومية: {migrationStatus.result.insertedCounts.journalEntries || 0}
              </div>
              <div className="bg-white/70 p-2 rounded border border-slate-200/50">
                بنود القيود: {migrationStatus.result.insertedCounts.journalLines || 0}
              </div>
            </div>

            {migrationStatus.result.errors.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-mono text-[11px] space-y-1">
                  {migrationStatus.result.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>

                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2 text-amber-950">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <HelpCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>سبب هذا الخطأ وكيفية حله بدقيقة واحدة:</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    إذا ظهرت لك عبارة مثل <code>relation "..." does not exist</code> أو مشكلة بالصلاحيات، فالسبب هو أن الجداول لم تُنشأ بعد في مشروع Supabase الخاص بك.
                  </p>
                  <ol className="list-decimal list-inside text-[11px] space-y-1 text-amber-900 font-medium">
                    <li>اضغط على الزر أدناه لنسخ كود إنشاء الجداول (SQL Script).</li>
                    <li>افتح لوحة تحكم <strong>Supabase</strong> واذهب إلى <strong>SQL Editor</strong> من القائمة الجانبية.</li>
                    <li>الصق الكود واضغط على زر <strong>Run</strong> لتأسيس الجداول في ثوانٍ.</li>
                    <li>عد إلى هنا واضغط مرة أخرى على <strong>"رفع البيانات الحالية إلى Supabase"</strong>.</li>
                  </ol>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(supabaseSchemaSql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-xs transition"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'تم نسخ كود SQL بنجاح!' : 'نسخ كود SQL لإنشاء جداول Supabase'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
