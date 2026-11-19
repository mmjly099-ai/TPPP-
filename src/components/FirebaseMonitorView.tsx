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
  ShieldCheck,
  Zap,
  LogIn,
  LogOut,
  CloudUpload,
  CloudDownload,
  Copy,
  Check,
  ExternalLink,
  History,
  HardDrive
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useFirebase, CloudAuditEntry } from '../firebase/FirebaseContext';
import { firebaseProjectMeta, FirestoreConnectionCheckResult } from '../firebase/config';
import { getOrCreateCurrentDevice, DeviceInfo, DeviceSyncRecord } from '../utils/deviceTracker';

export const FirebaseMonitorView: React.FC = () => {
  const {
    data: storeData,
    customers,
    orders,
    expenses,
    journalEntries,
    lastSyncTime,
    syncWithServer,
    isSyncing: isLocalSyncing,
    realtimeStatus: localRealtimeStatus,
    lastRealtimeEvent,
    importBackup,
    showNotification
  } = useStore();

  const {
    currentUser,
    isAdmin,
    isSyncing: isCloudSyncing,
    lastCloudSyncAt,
    cloudRevision,
    chunkInfo,
    firebaseRealtimeStatus,
    authError,
    loginWithGoogle,
    logout,
    testConnectionNow,
    saveStoreToCloud,
    loadStoreFromCloud,
    getConnectedCloudDevices,
    getRecentCloudAuditLogs
  } = useFirebase();

  const [currentDevice] = useState<DeviceInfo>(() => getOrCreateCurrentDevice());
  const [serverDevices, setServerDevices] = useState<DeviceSyncRecord[]>([]);
  const [cloudDevices, setCloudDevices] = useState<DeviceSyncRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<CloudAuditEntry[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const [health, setHealth] = useState<{
    tested: boolean;
    checking: boolean;
    result: FirestoreConnectionCheckResult | null;
  }>({
    tested: false,
    checking: false,
    result: null
  });

  const [uiNotice, setUiNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<'push' | 'pull' | null>(null);
  const [isRunningCloudOp, setIsRunningCloudOp] = useState(false);
  const [showDomainHelper, setShowDomainHelper] = useState(false);
  const [copiedHostname, setCopiedHostname] = useState(false);
  const [copiedProjectId, setCopiedProjectId] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const checkHealth = useCallback(async () => {
    setHealth(prev => ({ ...prev, checking: true }));
    const res = await testConnectionNow();
    setHealth({ tested: true, checking: false, result: res });
  }, [testConnectionNow]);

  const fetchAllTelemetry = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      const serverPromise = fetch('/api/sync/devices')
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);

      const cloudDevicesPromise = currentUser?.emailVerified
        ? getConnectedCloudDevices().catch(() => [])
        : Promise.resolve([]);

      const logsPromise = currentUser?.emailVerified
        ? getRecentCloudAuditLogs().catch(() => [])
        : Promise.resolve([]);

      const [srvJson, fbDevs, fbLogs] = await Promise.all([
        serverPromise,
        cloudDevicesPromise,
        logsPromise
      ]);

      if (srvJson?.success && Array.isArray(srvJson.devices)) {
        setServerDevices(srvJson.devices);
      }
      setCloudDevices(fbDevs);
      setAuditLogs(fbLogs);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [currentUser, getConnectedCloudDevices, getRecentCloudAuditLogs]);

  useEffect(() => {
    void checkHealth();
    void fetchAllTelemetry();
    const timer = setInterval(() => {
      void fetchAllTelemetry();
    }, 15000);
    return () => clearInterval(timer);
  }, [checkHealth, fetchAllTelemetry]);

  const mergedDevices = React.useMemo(() => {
    const map = new Map<string, DeviceSyncRecord>();
    serverDevices.forEach(d => map.set(d.deviceId, d));
    cloudDevices.forEach(d => {
      const existing = map.get(d.deviceId);
      if (!existing || new Date(d.lastSyncAt || 0).getTime() >= new Date(existing.lastSyncAt || 0).getTime()) {
        map.set(d.deviceId, d);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastSyncAt || 0).getTime() - new Date(a.lastSyncAt || 0).getTime()
    );
  }, [serverDevices, cloudDevices]);

  const handleGoogleSignIn = async () => {
    setUiNotice(null);
    try {
      await loginWithGoogle();
      setUiNotice({
        type: 'success',
        text: 'تم تسجيل الدخول بحساب Google وتفعيل المزامنة التلقائية مع Cloud Firestore بنجاح.'
      });
      void fetchAllTelemetry();
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || String(err?.message || '').includes('unauthorized-domain')) {
        setShowDomainHelper(true);
      } else if (err?.message) {
        setUiNotice({ type: 'error', text: err.message });
      }
    }
  };

  const executePushToFirestore = async () => {
    setConfirmAction(null);
    if (!currentUser || !currentUser.emailVerified) {
      setUiNotice({
        type: 'error',
        text: 'يرجى تسجيل الدخول أولاً بحساب Google الموثّق للكتابة في Cloud Firestore.'
      });
      return;
    }
    setIsRunningCloudOp(true);
    try {
      const payload = JSON.stringify(storeData);
      const ok = await saveStoreToCloud(
        payload,
        'رفع ومزامنة يدوية كاملة من وحدة مراقبة Firebase',
        {
          customersCount: customers.length,
          ordersCount: orders.length,
          expensesCount: expenses.length,
          journalEntriesCount: journalEntries.length
        },
        currentDevice.deviceId
      );
      if (ok) {
        setUiNotice({
          type: 'success',
          text: `تم رفع وحفظ قاعدة البيانات بالكامل إلى Cloud Firestore (${customers.length} عميل، ${orders.length} طلبية، ${journalEntries.length} قيد يومية).`
        });
        showNotification('تمت المزامنة الكاملة إلى Cloud Firestore بنجاح', 'success');
        void fetchAllTelemetry();
      }
    } catch (err: any) {
      setUiNotice({
        type: 'error',
        text: `تعذر الرفع إلى Firestore: ${err?.message || 'خطأ غير متوقع'}`
      });
    } finally {
      setIsRunningCloudOp(false);
    }
  };

  const executePullFromFirestore = async () => {
    setConfirmAction(null);
    if (!currentUser || !currentUser.emailVerified) {
      setUiNotice({
        type: 'error',
        text: 'يرجى تسجيل الدخول أولاً بحساب Google الموثّق للقراءة من Cloud Firestore.'
      });
      return;
    }
    setIsRunningCloudOp(true);
    try {
      const cloudRes = await loadStoreFromCloud();
      if (!cloudRes || !cloudRes.dataJson) {
        setUiNotice({
          type: 'info',
          text: 'لا توجد نسخة محفوظة بعد في Cloud Firestore. يمكنك الضغط على "رفع البيانات إلى Firestore الآن" لإنشاء النسخة الأولى.'
        });
        return;
      }

      const restoreResult = importBackup(cloudRes.dataJson);
      if (restoreResult.success) {
        setUiNotice({
          type: 'success',
          text: `تم سحب واستعادة البيانات من Cloud Firestore (${cloudRes.chunkCount} أجزاء) بنجاح وتحديث السيرفر المحلي.`
        });
        showNotification('تم سحب أحدث نسخة من Cloud Firestore بنجاح', 'success');
        void fetchAllTelemetry();
      } else {
        setUiNotice({ type: 'error', text: restoreResult.message });
      }
    } catch (err: any) {
      setUiNotice({
        type: 'error',
        text: `تعذر السحب من Firestore: ${err?.message || 'خطأ غير متوقع'}`
      });
    } finally {
      setIsRunningCloudOp(false);
    }
  };

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

  const estimatedBytes = React.useMemo(() => {
    try {
      return new Blob([JSON.stringify(storeData)]).size;
    } catch {
      return JSON.stringify(storeData).length;
    }
  }, [storeData]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              مراقبة ومزامنة Firebase Firestore & Auth
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              مزامنة سحابية مشفرة ومجزأة تلقائياً بين جميع الأجهزة مع مصادقة Google الآمنة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              void checkHealth();
              void syncWithServer();
              void fetchAllTelemetry();
            }}
            disabled={isLocalSyncing || isCloudSyncing || health.checking}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isLocalSyncing || isCloudSyncing || health.checking ? 'animate-spin' : ''}`} />
            <span>فحص الاتصال وتحديث الحالة</span>
          </button>
        </div>
      </div>

      {/* Inline Notice Banner */}
      {(uiNotice || authError) && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-bold ${
            uiNotice?.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : uiNotice?.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {uiNotice?.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <div className="flex-1 leading-relaxed">{uiNotice?.text || authError}</div>
          <button
            onClick={() => setUiNotice(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Firebase Auth Status & Project Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-orange-300"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-lg">
                  {currentUser ? (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase() : 'G'}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-900">
                    {currentUser ? currentUser.displayName || currentUser.email : 'حساب Google للمزامنة السحابية'}
                  </h3>
                  {currentUser ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {currentUser.emailVerified ? 'حساب موثّق ✓' : 'بانتظار التحقق'}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                      غير مسجل الدخول في السحابة
                    </span>
                  )}
                  {isAdmin && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-amber-300">
                      مدير النظام (Admin)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {currentUser
                    ? `البريد: ${currentUser.email} — المزامنة التلقائية مع Cloud Firestore نشطة.`
                    : 'سجّل الدخول بحساب Google المعتمد لتفعيل النسخ الاحتياطي والمزامنة السحابية الفورية عبر Cloud Firestore.'}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {currentUser ? (
                <button
                  onClick={() => logout()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول عبر Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Cloud Push / Pull Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setConfirmAction('push')}
              disabled={!currentUser || isRunningCloudOp || isCloudSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>رفع ومزامنة كافة البيانات إلى Firestore الآن</span>
            </button>

            <button
              onClick={() => setConfirmAction('pull')}
              disabled={!currentUser || isRunningCloudOp || isCloudSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <CloudDownload className="w-4 h-4" />
              <span>سحب واستعادة أحدث نسخة من Firestore</span>
            </button>

            <button
              onClick={() => setShowDomainHelper(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors mr-auto"
            >
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>إعداد النطاق المصرح</span>
            </button>
          </div>
        </div>

        {/* Project Identifiers Card */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-300">معرفات مشروع Firebase المرتبط</span>
            <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              Active Config
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block">Project ID</span>
                <span className="font-mono text-slate-100 truncate block">{firebaseProjectMeta.projectId}</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(firebaseProjectMeta.projectId);
                  setCopiedProjectId(true);
                  setTimeout(() => setCopiedProjectId(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer shrink-0"
                title="نسخ Project ID"
              >
                {copiedProjectId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Firestore Database ID</span>
              <span className="font-mono text-[11px] text-amber-300 break-all block mt-0.5">
                {firebaseProjectMeta.firestoreDatabaseId}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 block">Auth Domain</span>
              <span className="font-mono text-[11px] text-slate-200 break-all block mt-0.5">
                {firebaseProjectMeta.authDomain}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Telemetry Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Connection Health */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">حالة اتصال Firestore</span>
            <Zap className={`w-4 h-4 ${health.result?.ok ? 'text-emerald-600' : 'text-amber-500'}`} />
          </div>
          <div className="text-sm font-black text-slate-900">
            {health.checking
              ? 'جارٍ الفحص...'
              : health.result?.ok
              ? 'متصل ونشط'
              : 'تحقق من الشبكة'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span className="truncate">{health.result?.message || 'Cloud Firestore'}</span>
            {health.result?.latencyMs !== undefined && (
              <span className="font-mono font-bold text-emerald-700 shrink-0">{health.result.latencyMs}ms</span>
            )}
          </div>
        </div>

        {/* Card 2: Real-time Listener */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">المزامنة الفورية (Realtime)</span>
            <Activity
              className={`w-4 h-4 ${
                firebaseRealtimeStatus === 'connected' || localRealtimeStatus === 'connected'
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            />
          </div>
          <div className="text-sm font-black text-slate-900">
            {firebaseRealtimeStatus === 'connected'
              ? 'Firestore Snapshot نشط'
              : localRealtimeStatus === 'connected'
              ? 'مزامنة السيرفر نشطة'
              : 'بانتظار تسجيل الدخول'}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              آخر مزامنة سحابية: {lastCloudSyncAt || lastSyncTime || 'لم تتم بعد'}
            </span>
          </div>
        </div>

        {/* Card 3: Sharded Storage Status */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نظام التقسيم السحابي (Sharding)</span>
            <HardDrive className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm font-black text-slate-900 font-mono">
            {(estimatedBytes / (1024 * 1024)).toFixed(2)} MB
            <span className="text-xs font-sans font-bold text-slate-500 mr-1.5">
              ({chunkInfo ? `${chunkInfo.chunkCount} أجزاء سحابية` : 'تقسيم تلقائي < 1MB'})
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            {cloudRevision
              ? `رقم المراجعة السحابية: #${String(cloudRevision).slice(-6)}`
              : 'يدعم قواعد البيانات الكبيرة بدون حد 1MB'}
          </div>
        </div>

        {/* Card 4: Data Volume */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">السجلات المتزامنة</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-sm font-black text-slate-900 font-mono">
            {orders.length} طلب • {customers.length} عميل
          </div>
          <div className="text-[11px] text-slate-500">
            {journalEntries.length} قيد يومية • {expenses.length} مصروف
            {lastRealtimeEvent ? ` • آخر حدث: ${lastRealtimeEvent.time}` : ''}
          </div>
        </div>
      </div>

      {/* Connected Devices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              الأجهزة المتصلة والمتزامنة ({mergedDevices.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يعرض هذا الجهاز وكافة أجهزة اللابتوب والهواتف المسجلة في Firestore والسيرفر
            </p>
          </div>
          <button
            onClick={() => void fetchAllTelemetry()}
            disabled={isLoadingDevices}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            {isLoadingDevices ? 'جارٍ التحديث...' : 'تحديث القائمة'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">الجهاز</th>
                <th className="py-3 px-4">النظام والمتصفح</th>
                <th className="py-3 px-4">نوع المزامنة</th>
                <th className="py-3 px-4">السجلات</th>
                <th className="py-3 px-4">آخر مزامنة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mergedDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا توجد أجهزة مسجلة حتى الآن — قم بتسجيل الدخول عبر Google أو إجراء مزامنة.
                  </td>
                </tr>
              ) : (
                mergedDevices.map((dev) => {
                  const isCurrent = dev.deviceId === currentDevice.deviceId;
                  const DevIcon =
                    dev.deviceType === 'mobile'
                      ? Smartphone
                      : dev.deviceType === 'tablet'
                      ? Tablet
                      : Laptop;

                  return (
                    <tr key={dev.deviceId} className={isCurrent ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                            <DevIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{dev.deviceName}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  هذا الجهاز
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{dev.deviceId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{dev.os || 'غير محدد'}</div>
                        <div className="text-[11px] text-slate-400">{dev.browser}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            dev.syncType.startsWith('firebase')
                              ? 'bg-orange-50 text-orange-700 border border-orange-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {dev.syncType === 'firebase_push'
                            ? 'رفع Firestore'
                            : dev.syncType === 'firebase_pull'
                            ? 'سحب Firestore'
                            : dev.syncType === 'push'
                            ? 'رفع للسيرفر'
                            : 'سحب من السيرفر'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {dev.recordsCount
                          ? `${dev.recordsCount.orders} طلب / ${dev.recordsCount.customers} عميل`
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{formatTimeDifference(dev.lastSyncAt)}</div>
                        {dev.latencyMs !== undefined && (
                          <div className="text-[10px] font-mono text-slate-400">{dev.latencyMs}ms</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Cloud Audit Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <h3 className="text-sm font-black text-slate-900">سجل عمليات المزامنة السحابية في Firestore</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {currentUser
                ? 'لا توجد سجلات مزامنة سحابية بعد. اضغط "رفع ومزامنة كافة البيانات" لبدء التوثيق.'
                : 'سجّل الدخول بحساب Google لعرض سجل المزامنة السحابية.'}
            </div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 px-4 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{log.details}</span>
                  <span className="text-[10px] font-mono text-slate-400">{log.id}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono shrink-0">
                  {formatTimeDifference(log.createdAtIso)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h4 className="text-base font-black text-slate-900">
              {confirmAction === 'push'
                ? 'تأكيد رفع البيانات إلى Cloud Firestore'
                : 'تأكيد سحب واستعادة البيانات من Cloud Firestore'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmAction === 'push'
                ? 'سيتم حفظ كافة جداول النظام الحالية (العملاء، الطلبات، الدفعات، المحافظ، القيود المحاسبية، الشحنات، والمشتريات) في مستندات Cloud Firestore المجزأة بأمان.'
                : 'سيتم جلب أحدث نسخة محفوظة من Cloud Firestore وتطبيقها على النظام وتحديث البيانات المحلية.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() =>
                  confirmAction === 'push'
                    ? void executePushToFirestore()
                    : void executePullFromFirestore()
                }
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer ${
                  confirmAction === 'push' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmAction === 'push' ? 'نعم، رفع البيانات الآن' : 'نعم، سحب النسخة الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authorized Domain Helper Modal */}
      {showDomainHelper && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-black text-slate-900">إضافة النطاق في Firebase Authorized Domains</h4>
              <button
                onClick={() => setShowDomainHelper(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              إذا ظهرت رسالة <code className="bg-slate-100 px-1 rounded font-mono">auth/unauthorized-domain</code> عند تسجيل الدخول عبر Google، انسخ النطاق التالي وأضفه في Firebase Console تحت Authentication → Settings → Authorized domains:
            </p>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
              <input
                type="text"
                readOnly
                value={currentHostname}
                className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(currentHostname);
                  setCopiedHostname(true);
                  setTimeout(() => setCopiedHostname(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                {copiedHostname ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHostname ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <a
                href={`https://console.firebase.google.com/project/${firebaseProjectMeta.projectId}/authentication/settings`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold"
              >
                <span>فتح Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowDomainHelper(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
