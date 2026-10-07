import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  History,
  Download,
  Eye,
  SlidersHorizontal,
  Layers,
  Database,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Info,
  Lock
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  ParsedFileData,
  ParsedSheet,
  TargetEntity,
  FieldMapping,
  ImportValidationResult,
  DeduplicationMode,
  ImportOperationRecord
} from '../../types/import';
import { parseImportFile } from '../../utils/fileParser';
import { TARGET_FIELDS, detectSheetEntity, autoMapColumns } from '../../utils/columnRecognizer';
import { validateImportBatch } from '../../utils/importValidator';
import {
  executeImportBatch,
  getStoredImportHistory,
  rollbackImportOperation
} from '../../utils/importExecutor';
import { exportToXlsx, exportToCsv } from '../../utils/dataExporter';

type ImportStep =
  | 'upload'
  | 'mapping'
  | 'validation'
  | 'confirm'
  | 'importing'
  | 'completed';

export const DataImportView: React.FC = () => {
  const {
    data,
    setRawStoreData,
    customers,
    orders,
    payments,
    expenses,
    accounts,
    purchaseBatches,
    otherReceivables,
    downloadBackupFile
  } = useStore();

  const [activeMainTab, setActiveMainTab] = useState<'wizard' | 'history' | 'export'>('wizard');

  // Wizard state
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [isNativeTopStoreMode, setIsNativeTopStoreMode] = useState(false);
  const [parsedFile, setParsedFile] = useState<ParsedFileData | null>(null);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [selectedEntity, setSelectedEntity] = useState<TargetEntity>('orders');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [deduplicationMode, setDeduplicationMode] = useState<DeduplicationMode>('skip');

  // Validation state
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [validationFilter, setValidationFilter] = useState<'all' | 'ready' | 'review' | 'duplicate' | 'error'>('all');

  // Progress state
  const [progressStage, setProgressStage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressDetails, setProgressDetails] = useState<string>('');

  // Result & History
  const [lastOperation, setLastOperation] = useState<ImportOperationRecord | null>(null);
  const [historyList, setHistoryList] = useState<ImportOperationRecord[]>([]);

  // Rollback modal
  const [rollbackOp, setRollbackOp] = useState<ImportOperationRecord | null>(null);
  const [isRollbackLoading, setIsRollbackLoading] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistoryList(getStoredImportHistory());
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle File Selection
  const handleFile = async (file: File) => {
    setErrorMessage(null);
    setIsAnalyzing(true);

    try {
      const parsed = await parseImportFile(file);
      setParsedFile(parsed);

      if (parsed.isTopStoreNative) {
        setIsNativeTopStoreMode(true);
      }

      // Initialize default sheet
      if (parsed.sheets.length > 0) {
        const sheet = parsed.sheets[0];
        const detectedEntity = detectSheetEntity(sheet.sheetName, sheet.headers);
        setSelectedSheetIndex(0);
        setSelectedEntity(detectedEntity);

        const mappings = autoMapColumns(sheet.headers, detectedEntity, sheet.rows);
        setFieldMappings(mappings);
      }

      setCurrentStep('mapping');
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء قراءة الملف وتحليله.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // When sheet or entity changes, re-calculate mapping
  const handleEntityChange = (newEntity: TargetEntity) => {
    setSelectedEntity(newEntity);
    if (parsedFile && parsedFile.sheets[selectedSheetIndex]) {
      const sheet = parsedFile.sheets[selectedSheetIndex];
      const mappings = autoMapColumns(sheet.headers, newEntity, sheet.rows);
      setFieldMappings(mappings);
    }
  };

  const handleSheetChange = (sheetIdx: number) => {
    setSelectedSheetIndex(sheetIdx);
    if (parsedFile && parsedFile.sheets[sheetIdx]) {
      const sheet = parsedFile.sheets[sheetIdx];
      const detected = detectSheetEntity(sheet.sheetName, sheet.headers);
      setSelectedEntity(detected);
      const mappings = autoMapColumns(sheet.headers, detected, sheet.rows);
      setFieldMappings(mappings);
    }
  };

  // Handle manual column mapping change
  const handleMappingChange = (fileCol: string, targetField: string) => {
    setFieldMappings(prev =>
      prev.map(m => (m.fileColumn === fileCol ? { ...m, targetField, isAutoMatched: false } : m))
    );
  };

  // Trigger Validation
  const handleRunValidation = () => {
    if (!parsedFile || !parsedFile.sheets[selectedSheetIndex]) return;
    const sheet = parsedFile.sheets[selectedSheetIndex];

    const result = validateImportBatch(
      selectedEntity,
      sheet.rows,
      fieldMappings,
      {
        customers,
        orders,
        payments,
        expenses,
        accounts,
        purchaseBatches,
        otherReceivables
      },
      deduplicationMode
    );

    setValidationResult(result);
    setCurrentStep('validation');
  };

  // Direct Apply Native Backup (from ZIP or JSON)
  const handleApplyNativeDirectly = () => {
    if (!parsedFile?.rawNativeData) return;
    const raw = parsedFile.rawNativeData;
    setRawStoreData(raw);

    const totalRecords: number = Object.values(raw.tables || {}).reduce(
      (sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    ) as number;

    const opRecord: ImportOperationRecord = {
      id: `RESTORE-${Date.now().toString().slice(-6)}`,
      fileName: parsedFile.fileName,
      fileType: parsedFile.fileType,
      fileSize: parsedFile.fileSize,
      timestamp: new Date().toISOString(),
      performedBy: 'مالك مجلي (مدير النظام)',
      status: 'completed',
      deduplicationMode: 'update',
      totalRecords,
      addedCount: totalRecords,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      entityCounts: {
        customers: raw.tables?.customers?.length || 0,
        orders: raw.tables?.orders?.length || 0,
        accounts: raw.tables?.accounts?.length || 0,
        payments: raw.tables?.payments?.length || 0,
        expenses: raw.tables?.expenses?.length || 0
      },
      backupSnapshotId: `SNAP-${Date.now()}`,
      createdRecordIds: {
        customers: [],
        orders: [],
        payments: [],
        expenses: [],
        accounts: [],
        purchaseBatches: [],
        financialTransactions: [],
        otherReceivables: []
      },
      notes: 'استعادة كاملة لقاعدة البيانات المحاسبية'
    };

    setLastOperation(opRecord);
    setCurrentStep('completed');
  };

  // Execute Batch Import
  const handleStartImport = async () => {
    if (!parsedFile || !parsedFile.sheets[selectedSheetIndex]) return;
    const sheet = parsedFile.sheets[selectedSheetIndex];

    setCurrentStep('importing');
    setProgressPercent(5);
    setProgressStage('جاري الفحص وبدء النسخ الاحتياطي...');

    try {
      const result = await executeImportBatch({
        currentData: data,
        entity: selectedEntity,
        rows: sheet.rows,
        mappings: fieldMappings,
        deduplicationMode,
        fileInfo: {
          name: parsedFile.fileName,
          type: parsedFile.fileType,
          size: parsedFile.fileSize
        },
        currentUser: 'المدير العام (مالك مجلي)',
        onProgress: (stage, percent, details) => {
          setProgressStage(stage);
          setProgressPercent(percent);
          setProgressDetails(details || '');
        }
      });

      // Update global context state
      setRawStoreData(result.updatedData);
      setLastOperation(result.operation);
      setHistoryList(getStoredImportHistory());
      setCurrentStep('completed');
      setSuccessMessage(result.message);
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشلت عملية الاستيراد. تم الحفاظ على بياناتك بالكامل دون تعديل.');
      setCurrentStep('validation');
    }
  };

  // Rollback Action
  const handleConfirmRollback = () => {
    if (!rollbackOp) return;
    setIsRollbackLoading(true);

    try {
      const res = rollbackImportOperation(data, rollbackOp.id, 'remove_created_only');
      if (res.success && res.updatedData) {
        setRawStoreData(res.updatedData);
        setHistoryList(getStoredImportHistory());
        setSuccessMessage(res.message);
        setRollbackOp(null);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل التراجع عن العملية.');
    } finally {
      setIsRollbackLoading(false);
    }
  };

  // Reset wizard
  const handleResetWizard = () => {
    setParsedFile(null);
    setFieldMappings([]);
    setValidationResult(null);
    setCurrentStep('upload');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  استيراد البيانات ونقل السجلات
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  معالج ذكي لترحيل ملفات Excel و CSV و JSON مع مطابقة الأعمدة ومنع التكرار والحفاظ على العلاقات
                </p>
              </div>
            </div>
          </div>

          {/* Security & Role Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>صلاحية: المدير العام</span>
              <span className="text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded font-mono">حماية كاملة</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
              <Database className="w-4 h-4 text-slate-500" />
              <span>النسخ الاحتياطي الآلي: مُفعل</span>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-5 border-t border-slate-100 pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveMainTab('wizard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'wizard'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>معالج الاستيراد والنقل</span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('history');
              setHistoryList(getStoredImportHistory());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'history'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل عمليات الاستيراد والتراجع</span>
            {historyList.length > 0 && (
              <span className="text-[10px] bg-white/30 text-white px-1.5 py-0.2 rounded-full font-mono">
                {historyList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveMainTab('export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeMainTab === 'export'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تصدير بيانات النظام (XLSX / CSV / JSON)</span>
          </button>
        </div>
      </div>

      {/* Global Alert Messages */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">تنبيه أثناء العملية:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">اكتمل بنجاح:</strong>
              <span>{successMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-800 text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* =========================================================
          TAB 1: WIZARD
      ========================================================= */}
      {activeMainTab === 'wizard' && (
        <div className="space-y-6">

          {/* Stepper Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs overflow-x-auto no-scrollbar">
            <div className="flex items-center justify-between min-w-[580px] text-xs font-bold">
              
              <div className={`flex items-center gap-2 ${currentStep === 'upload' ? 'text-amber-600' : 'text-slate-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep === 'upload' ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100'}`}>
                  1
                </div>
                <span>رفع الملف</span>
              </div>

              <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

              <div className={`flex items-center gap-2 ${currentStep === 'mapping' ? 'text-amber-600' : 'text-slate-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep === 'mapping' ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100'}`}>
                  2
                </div>
                <span>مطابقة الحقول</span>
              </div>

              <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

              <div className={`flex items-center gap-2 ${currentStep === 'validation' ? 'text-amber-600' : 'text-slate-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep === 'validation' ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100'}`}>
                  3
                </div>
                <span>فحص التكرار والأخطاء</span>
              </div>

              <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

              <div className={`flex items-center gap-2 ${currentStep === 'confirm' || currentStep === 'importing' ? 'text-amber-600' : 'text-slate-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep === 'confirm' || currentStep === 'importing' ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100'}`}>
                  4
                </div>
                <span>التأكيد والاستيراد</span>
              </div>

              <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

              <div className={`flex items-center gap-2 ${currentStep === 'completed' ? 'text-emerald-600' : 'text-slate-500'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${currentStep === 'completed' ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-100'}`}>
                  ✓
                </div>
                <span>التقرير النهائي</span>
              </div>

            </div>
          </div>

          {/* ----------------------------------------------------
              STEP 1: UPLOAD
          ---------------------------------------------------- */}
          {currentStep === 'upload' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  اختر أو اسحب ملف البيانات المراد استيراده
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  يدعم النظام ملفات Excel (.xlsx, .xls) وجداول CSV وترميز UTF-8 العربي وملفات النسخ الاحتياطي JSON
                </p>
              </div>

              {/* Native TOP STORE Checkbox */}
              <div className="max-w-xl mx-auto bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <div>
                    <span className="font-bold text-amber-900 block">استيراد نسخة TOP STORE القديمة</span>
                    <span className="text-amber-700 text-[11px]">يتعرف النظام تلقائياً على بنية الملف وربط كافة العملاء والطلبات والحسابات دون مطابقة يدوية.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isNativeTopStoreMode}
                  onChange={e => setIsNativeTopStoreMode(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {/* Dropzone */}
              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`max-w-2xl mx-auto border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/60 scale-[1.01]'
                    : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json,.zip"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 shadow-2xs">
                  {isAnalyzing ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-600" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-base sm:text-lg font-bold text-slate-800">
                    {isAnalyzing ? 'جاري تحليل وفك ضغط الملف وقراءة البيانات...' : 'انقر لاختيار ملف، أو اسحبه وأفلته هنا'}
                  </p>
                  <p className="text-xs text-slate-400">
                    الصيغ المدعومة: ZIP (أرشيف دائم), XLSX, XLS, CSV (UTF-8), JSON • الحد الأقصى 50 ميجابايت
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                    <Layers className="w-3.5 h-3.5 text-amber-700" /> أرشيف ZIP دائم (top-store-accounting-permanent.zip)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX / XLS
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    <FileText className="w-3.5 h-3.5" /> CSV (UTF-8)
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                    <FileCode className="w-3.5 h-3.5" /> JSON (نسخة احتياطية)
                  </span>
                </div>
              </div>

              {/* Explanatory Safety Notice */}
              <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800 block mb-1">🛡️ لا استبدال للبيانات</span>
                  <p className="text-slate-500 text-[11px]">الاستيراد يتم بطريقة آمنة ومعزولة دون حذف أي سجل موجود حالياً.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800 block mb-1">🔁 فحص وتصفية التكرار</span>
                  <p className="text-slate-500 text-[11px]">كشف هواتف العملاء وأرقام الطلبات المكررة تلقائياً قبل إدخالها.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="font-bold text-slate-800 block mb-1">↩️ إمكانية التراجع الفوري</span>
                  <p className="text-slate-500 text-[11px]">نسخة احتياطية تلقائية مع زر تراجع لإلغاء أي استيراد بضغطة زر.</p>
                </div>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------
              STEP 2: MAPPING & SELECTION
          ---------------------------------------------------- */}
          {currentStep === 'mapping' && parsedFile && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
              
              {/* File Info Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{parsedFile.fileName}</h3>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                      <span>الحجم: {formatFileSize(parsedFile.fileSize)}</span>
                      <span>•</span>
                      <span>النوع: {parsedFile.fileType.toUpperCase()}</span>
                      <span>•</span>
                      <span>عدد الصفحات: {parsedFile.sheets.length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={handleResetWizard}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    تغيير الملف
                  </button>
                </div>
              </div>

              {/* Direct 1-Click Restore Banner for TOP STORE Native Backup (ZIP or JSON) */}
              {parsedFile.isTopStoreNative && parsedFile.rawNativeData && (
                <div className="p-4 sm:p-5 bg-gradient-to-l from-emerald-50 via-emerald-50/70 to-teal-50 border-2 border-emerald-400 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-emerald-950 flex items-center gap-2">
                        <span>تم التحقق من الأرشيف المحاسبي الدائم لـ TOP STORE!</span>
                        <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          تطبيق فوري
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        يحتوي هذا الملف على قاعدة بيانات متكاملة لجميع السجلات والعملاء والطلبات والمحافظ والمصروفات ودفعات المشتريات والقيود المحاسبية.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyNativeDirectly}
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-2"
                  >
                    <span>تطبيق واستعادة كافة السجلات في النظام الآن</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sheet & Target Entity Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Sheet selection (if multiple) */}
                {parsedFile.sheets.length > 1 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      اختر الورقة / الجدول من الملف:
                    </label>
                    <select
                      value={selectedSheetIndex}
                      onChange={e => handleSheetChange(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    >
                      {parsedFile.sheets.map((sheet, idx) => (
                        <option key={idx} value={idx}>
                          {sheet.sheetName} ({sheet.totalRows} سجل)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Target Entity Selector */}
                <div className={parsedFile.sheets.length === 1 ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    نوع البيانات المراد استيرادها في نظام TOP STORE:
                  </label>
                  <select
                    value={selectedEntity}
                    onChange={e => handleEntityChange(e.target.value as TargetEntity)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="orders">الطلبات (Orders) - الربط التلقائي مع العملاء والدفعات</option>
                    <option value="customers">العملاء (Customers) - أرقام الهواتف والعناوين والأرصدة</option>
                    <option value="payments">المدفوعات وسندات القبض (Payments) - ربط بالطلبات والمحافظ</option>
                    <option value="expenses">المصروفات وسندات الصرف (Expenses) - بنود التشغيل والتسويق</option>
                    <option value="accounts">المحافظ والبنوك (Accounts) - الصناديق والأرصدة الافتتاحية</option>
                    <option value="purchaseBatches">دفعات المشتريات (Purchase Batches) - مشتريات شي إن وعلي إكسبرس</option>
                    <option value="otherReceivables">الذمم المدينة ورأس المال (Receivables & Assets)</option>
                  </select>
                </div>

              </div>

              {/* Deduplication Preference Box */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4">
                <label className="block text-xs font-bold text-amber-950 mb-2">
                  🛡️ سياسة التعامل مع السجلات المكررة (هواتف / أرقام طلبات موجودة مسبقاً):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  
                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    deduplicationMode === 'skip'
                      ? 'bg-amber-100 border-amber-400 font-bold text-amber-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="dedupMode"
                      checked={deduplicationMode === 'skip'}
                      onChange={() => setDeduplicationMode('skip')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span>تخطي المكرر (الخيار الآمن الافتراضي)</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">عدم إدخال أي سجل موجود مسبقاً للحفاظ على البيانات دون مضاعفة.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    deduplicationMode === 'update'
                      ? 'bg-amber-100 border-amber-400 font-bold text-amber-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="dedupMode"
                      checked={deduplicationMode === 'update'}
                      onChange={() => setDeduplicationMode('update')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span>تحديث السجلات الموجودة</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">تحديث بيانات السجل المطابق في النظام ببيانات الملف الجديد.</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    deduplicationMode === 'keep_both'
                      ? 'bg-amber-100 border-amber-400 font-bold text-amber-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="dedupMode"
                      checked={deduplicationMode === 'keep_both'}
                      onChange={() => setDeduplicationMode('keep_both')}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <span>الاحتفاظ بالاثنين</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">توليد رقم تعريفي جديد وإدخال السجل كنسخة جديدة.</span>
                    </div>
                  </label>

                </div>
              </div>

              {/* Column Mapping Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    جدول مطابقة الأعمدة ({fieldMappings.length} عمود مكتشف في الملف)
                  </h3>
                  <span className="text-xs text-slate-500">
                    يمكنك تعديل أي حقل أو تعيينه إلى (تجاهل)
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="p-3">العمود في الملف</th>
                          <th className="p-3">أمثلة من البيانات</th>
                          <th className="p-3">الحقل المقابل في TOP STORE</th>
                          <th className="p-3 text-center">حالة المطابقة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fieldMappings.map((mapping, mIdx) => {
                          const isSkipped = mapping.targetField === '__skip__';
                          const targetDef = TARGET_FIELDS[selectedEntity].fields.find(f => f.key === mapping.targetField);

                          return (
                            <tr key={mIdx} className={`hover:bg-slate-50/80 ${isSkipped ? 'opacity-60 bg-slate-50/30' : ''}`}>
                              
                              {/* File Column */}
                              <td className="p-3 font-bold text-slate-800">
                                {mapping.fileColumn}
                              </td>

                              {/* Sample values */}
                              <td className="p-3 text-slate-500 font-mono text-[11px] max-w-[200px] truncate">
                                {mapping.sampleValues.length > 0
                                  ? mapping.sampleValues.join(' | ')
                                  : '—'}
                              </td>

                              {/* Target Field Dropdown */}
                              <td className="p-3">
                                <select
                                  value={mapping.targetField}
                                  onChange={e => handleMappingChange(mapping.fileColumn, e.target.value)}
                                  className={`w-full border rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                                    isSkipped
                                      ? 'bg-slate-100 text-slate-500 border-slate-300'
                                      : 'bg-white text-slate-900 border-slate-300 focus:ring-1 focus:ring-amber-500'
                                  }`}
                                >
                                  <option value="__skip__">➖ تجاهل هذا العمود (عدم استيراد)</option>
                                  <optgroup label={`حقول ${TARGET_FIELDS[selectedEntity].label}`}>
                                    {TARGET_FIELDS[selectedEntity].fields.map(f => (
                                      <option key={f.key} value={f.key}>
                                        {f.label} {f.required ? '*' : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                </select>
                              </td>

                              {/* Status Badge */}
                              <td className="p-3 text-center">
                                {isSkipped ? (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                    تم التجاهل
                                  </span>
                                ) : mapping.isAutoMatched ? (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    متطابق ذكياً
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                                    محدد يدوياً
                                  </span>
                                )}
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={handleResetWizard}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء والعودة
                </button>

                <button
                  onClick={handleRunValidation}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <span>فحص البيانات واكتشاف الأخطاء</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------
              STEP 3: VALIDATION & DUPLICATES
          ---------------------------------------------------- */}
          {currentStep === 'validation' && validationResult && parsedFile && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    نتيجة فحص البيانات والتحقق المحاسبي
                  </h2>
                  <p className="text-xs text-slate-500">
                    فحص شامل لـ {validationResult.totalRows} سجل في ملف ({parsedFile.fileName})
                  </p>
                </div>

                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                  السياسة المختارة: {deduplicationMode === 'skip' ? 'تخطي المكرر' : deduplicationMode === 'update' ? 'تحديث المكرر' : 'إضافة كلاهما'}
                </div>
              </div>

              {/* Metrics Result Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Ready */}
                <button
                  onClick={() => setValidationFilter('ready')}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                    validationFilter === 'ready'
                      ? 'bg-emerald-50 border-emerald-400 shadow-2xs ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 hover:bg-emerald-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600">سجلات جاهزة</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                    {validationResult.readyCount}
                  </div>
                  <span className="text-[10px] text-emerald-600 mt-0.5 block">مكتملة وصالحة 100%</span>
                </button>

                {/* Review */}
                <button
                  onClick={() => setValidationFilter('review')}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                    validationFilter === 'review'
                      ? 'bg-amber-50 border-amber-400 shadow-2xs ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600">تحتاج مراجعة</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
                    {validationResult.reviewCount}
                  </div>
                  <span className="text-[10px] text-amber-600 mt-0.5 block">تنبيهات غير مانعة</span>
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => setValidationFilter('duplicate')}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                    validationFilter === 'duplicate'
                      ? 'bg-blue-50 border-blue-400 shadow-2xs ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600">سجلات مكررة</span>
                    <Copy className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
                    {validationResult.duplicateCount}
                  </div>
                  <span className="text-[10px] text-blue-600 mt-0.5 block">
                    {deduplicationMode === 'skip' ? 'سيتم تخطيها' : 'سيتم تحديثها'}
                  </span>
                </button>

                {/* Errors */}
                <button
                  onClick={() => setValidationFilter('error')}
                  className={`p-4 rounded-xl border text-right transition-all cursor-pointer ${
                    validationFilter === 'error'
                      ? 'bg-rose-50 border-rose-400 shadow-2xs ring-1 ring-rose-400'
                      : 'bg-white border-slate-200 hover:bg-rose-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-600">بها أخطاء صريحة</span>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
                    {validationResult.errorCount}
                  </div>
                  <span className="text-[10px] text-rose-600 mt-0.5 block">حقول أساسية مفقودة</span>
                </button>

              </div>

              {/* Issues Detail Box (if any) */}
              {validationResult.issues.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      قائمة التنبيهات والأخطاء المكتشفة ({validationResult.issues.length}):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      الأخطاء لن تمنع استيراد بقية السجلات السليمة
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                    {validationResult.issues.slice(0, 20).map((issue, iIdx) => (
                      <div
                        key={iIdx}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${
                          issue.type === 'error'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : issue.type === 'duplicate'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span className="font-mono font-bold bg-white px-1.5 py-0.2 rounded text-[10px]">
                          السطر {issue.rowNumber}
                        </span>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                    {validationResult.issues.length > 20 && (
                      <p className="text-center text-[11px] text-slate-400 pt-1">
                        ... و {validationResult.issues.length - 20} ملاحظة إضافية
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Records Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">معاينة السجلات:</span>
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        onClick={() => setValidationFilter('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          validationFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        الكل ({validationResult.totalRows})
                      </button>
                      <button
                        onClick={() => setValidationFilter('ready')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          validationFilter === 'ready' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        جاهزة ({validationResult.readyCount})
                      </button>
                      <button
                        onClick={() => setValidationFilter('duplicate')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          validationFilter === 'duplicate' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        مكررة ({validationResult.duplicateCount})
                      </button>
                      <button
                        onClick={() => setValidationFilter('error')}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          validationFilter === 'error' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        أخطاء ({validationResult.errorCount})
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">الحالة</th>
                          <th className="p-2.5">المعرف / المفتاح</th>
                          <th className="p-2.5">البيان / الاسم</th>
                          <th className="p-2.5">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {validationResult.previewRecords
                          .filter(r => (validationFilter === 'all' ? true : r.status === validationFilter))
                          .slice(0, 30)
                          .map((rec, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/80">
                              <td className="p-2.5 text-slate-400 font-bold">{rec.rowNumber}</td>
                              <td className="p-2.5">
                                {rec.status === 'ready' && (
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                    جاهز ✅
                                  </span>
                                )}
                                {rec.status === 'review' && (
                                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                    مراجعة ⚠️
                                  </span>
                                )}
                                {rec.status === 'duplicate' && (
                                  <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                    مكرر 🔁
                                  </span>
                                )}
                                {rec.status === 'error' && (
                                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold text-[10px]">
                                    خطأ ❌
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 font-bold text-slate-800">
                                {rec.data.orderNumber || rec.data.phone || rec.data.paymentNumber || rec.data.name || '—'}
                              </td>
                              <td className="p-2.5 text-slate-700 font-sans">
                                {rec.data.customerName || rec.data.name || rec.data.description || rec.data.category || '—'}
                              </td>
                              <td className="p-2.5 text-slate-500 font-sans">
                                {rec.issueMessage || rec.duplicateMatchField || 'سجل مطابق وسليم'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep('mapping')}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  العودة لمطابقة الحقول
                </button>

                <button
                  onClick={() => setCurrentStep('confirm')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <span>متابعة لخطوة التأكيد والنسخ الاحتياطي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------
              STEP 4: CONFIRM & BACKUP
          ---------------------------------------------------- */}
          {currentStep === 'confirm' && parsedFile && validationResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-2xl mx-auto">
              
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
                  <ShieldCheck className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  تأكيد استيراد ونقل البيانات
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  أنت على وشك استيراد البيانات إلى نظام TOP STORE. تأكد من مراجعة ملخص العملية أدناه.
                </p>
              </div>

              {/* Summary Box */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">اسم الملف:</span>
                  <span className="font-bold text-slate-900">{parsedFile.fileName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">القسم المستهدف:</span>
                  <span className="font-bold text-amber-800">{TARGET_FIELDS[selectedEntity].label}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">إجمالي السجلات المفحوصة:</span>
                  <span className="font-bold text-slate-900 font-mono">{validationResult.totalRows} سجل</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">السجلات الجاهزة للإضافة:</span>
                  <span className="font-bold text-emerald-700 font-mono">{validationResult.readyCount + validationResult.reviewCount} سجل</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                  <span className="text-slate-500">السجلات المكررة:</span>
                  <span className="font-bold text-blue-700 font-mono">
                    {validationResult.duplicateCount} سجل ({deduplicationMode === 'skip' ? 'سيتم تخطيها' : 'تحديث'})
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">النسخ الاحتياطي التلقائي:</span>
                  <span className="font-bold text-emerald-700">مُفعل إجبارياً قبل إدخال أي سجل ✅</span>
                </div>
              </div>

              {/* Mandatory Notice */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>ضمان الأمان وسلامة الحسابات:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed pr-5">
                  سيقوم النظام بحفظ نقطة استعادة كاملة (Backup Snapshot) قبل معالجة أي سجل. وفي حال رغبتك بالتراجع، يمكنك استخدام زر التراجع لحذف السجلات المستوردة فقط وإرجاع الحسابات كما كانت تماماً.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep('validation')}
                  className="w-full sm:w-1/3 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  العودة للمعاينة
                </button>

                <button
                  onClick={handleStartImport}
                  className="w-full sm:w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  🚀 تأكيد استيراد البيانات والبدء الآمن
                </button>
              </div>

            </div>
          )}

          {/* ----------------------------------------------------
              STEP 5: IMPORTING WITH PROGRESS BAR
          ---------------------------------------------------- */}
          {currentStep === 'importing' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-6 max-w-xl mx-auto text-center">
              
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">{progressStage || 'جاري استيراد البيانات...'}</h3>
                <p className="text-xs text-slate-500">{progressDetails || 'معالجة دفعات السجلات وحفظ القيود المحاسبية...'}</p>
              </div>

              {/* Real Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600">
                  <span>التقدم الفعلي</span>
                  <span>{progressPercent}%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                يرجى الانتظار حتى اكتمال معالجة الدفعات دون إغلاق المتصفح.
              </div>

            </div>
          )}

          {/* ----------------------------------------------------
              STEP 6: COMPLETED REPORT
          ---------------------------------------------------- */}
          {currentStep === 'completed' && lastOperation && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 max-w-2xl mx-auto">
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  اكتملت عملية الاستيراد بنجاح!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-mono">
                  رقم العملية: {lastOperation.id} • {new Date(lastOperation.timestamp).toLocaleString('ar-YE')}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-800 block">تمت إضافتها</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">{lastOperation.addedCount}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <span className="text-[11px] font-bold text-blue-800 block">تم تحديثها</span>
                  <span className="text-xl font-black text-blue-700 font-mono">{lastOperation.updatedCount}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block">تم تخطيها</span>
                  <span className="text-xl font-black text-slate-700 font-mono">{lastOperation.skippedCount}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <span className="text-[11px] font-bold text-rose-800 block">أخطاء</span>
                  <span className="text-xl font-black text-rose-700 font-mono">{lastOperation.errorCount}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={handleResetWizard}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  استيراد ملف آخر
                </button>

                <button
                  onClick={() => setActiveMainTab('history')}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  عرض سجل العمليات
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* =========================================================
          TAB 2: AUDIT & HISTORY LOG
      ========================================================= */}
      {activeMainTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">سجل عمليات الاستيراد والنقل</h2>
              <p className="text-xs text-slate-500">
                توثيق كامل لكافة عمليات استيراد البيانات مع إمكانية التراجع عن أي عملية بأمان دون المساس بالبيانات القديمة
              </p>
            </div>

            <button
              onClick={() => setHistoryList(getStoredImportHistory())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer self-start"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث السجل</span>
            </button>
          </div>

          {historyList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">لا توجد عمليات استيراد سابقة مسجلة</p>
              <p className="text-xs text-slate-400">ستظهر هنا أي عملية استيراد تنفذها مع تفاصيلها وزر التراجع.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyList.map(op => {
                const isRolledBack = op.status === 'rolled_back';

                return (
                  <div key={op.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {op.id}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{op.fileName}</h4>
                        {isRolledBack ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                            تم التراجع ↩️
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                            مكتمل بنجاح ✅
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono pt-1">
                        <span>{new Date(op.timestamp).toLocaleString('ar-YE')}</span>
                        <span>•</span>
                        <span>بواسطة: {op.performedBy}</span>
                        <span>•</span>
                        <span>الحجم: {formatFileSize(op.fileSize)}</span>
                        <span>•</span>
                        <span>الصيغة: {op.fileType.toUpperCase()}</span>
                      </div>

                      {/* Counts breakdown */}
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold font-mono">
                          +{op.addedCount} أُضيفت
                        </span>
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold font-mono">
                          {op.updatedCount} حُدثت
                        </span>
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold font-mono">
                          {op.skippedCount} تُخطيت
                        </span>
                        {op.errorCount > 0 && (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold font-mono">
                            {op.errorCount} أخطاء
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rollback action */}
                    <div className="shrink-0">
                      {isRolledBack ? (
                        <span className="text-xs text-slate-400 font-bold">تم إلغاء السجلات بنجاح</span>
                      ) : (
                        <button
                          onClick={() => setRollbackOp(op)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>التراجع عن هذه العملية</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =========================================================
          TAB 3: SYSTEM EXPORT
      ========================================================= */}
      {activeMainTab === 'export' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          
          <div>
            <h2 className="text-lg font-bold text-slate-900">تصدير بيانات نظام TOP STORE</h2>
            <p className="text-xs text-slate-500">
              قم بتصدير قاعدة بياناتك بالكامل إلى ملفات Excel أو CSV أو JSON قابلة للفتح وإعادة الاستيراد في أي وقت.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Multi-sheet XLSX */}
            <div className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-all bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">مصنف Excel متكامل (.xlsx)</h3>
                <p className="text-xs text-slate-500">
                  يحتوي على أوراق منفصلة للعملاء، الطلبات، المدفوعات، المصروفات، المحافظ، ودفعات المشتريات.
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    exportToXlsx(data);
                    setSuccessMessage('تم تصدير مصنف Excel بنجاح!');
                  } catch (err: any) {
                    setErrorMessage(err?.message || 'فشل تصدير ملف Excel');
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف XLSX</span>
              </button>
            </div>

            {/* Card 2: JSON Native Backup */}
            <div className="border border-slate-200 rounded-2xl p-5 hover:border-amber-300 transition-all bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <FileCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">نسخة احتياطية قياسية (.json)</h3>
                <p className="text-xs text-slate-500">
                  ملف بنية قاعدة البيانات الأصلية لمتجر TOP STORE. متوافق 100% مع الاستعادة المباشرة.
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    downloadBackupFile();
                    setSuccessMessage('تم حفظ نسخة JSON الاحتياطية بنجاح!');
                  } catch (err: any) {
                    setErrorMessage(err?.message || 'فشل تصدير ملف JSON');
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تحميل ملف JSON</span>
              </button>
            </div>

            {/* Card 3: CSV UTF-8 with BOM */}
            <div className="border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all bg-slate-50/50 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">تصدير العملاء (.csv عربي)</h3>
                <p className="text-xs text-slate-500">
                  ملف CSV بترميز UTF-8 مع BOM لدعم الخط العربي الأصلي مباشرة بدون تشويه داخل Excel.
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    exportToCsv(
                      customers.map(c => ({
                        'رقم العميل': c.code,
                        'اسم العميل': c.name,
                        'رقم الهاتف': c.phone,
                        'المحافظة': c.governorate,
                        'موقع الاستلام': c.pickupLocation || '',
                        'الرصيد الافتتاحي': c.openingBalance
                      })),
                      'العملاء'
                    );
                    setSuccessMessage('تم تصدير ملف CSV بنجاح!');
                  } catch (err: any) {
                    setErrorMessage(err?.message || 'فشل تصدير ملف CSV');
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تحميل CSV العملاء</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================
          ROLLBACK CONFIRMATION MODAL
      ========================================================= */}
      {rollbackOp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                تأكيد التراجع عن عملية الاستيراد ({rollbackOp.id})
              </h3>
              <p className="text-xs text-slate-500">
                ملف: {rollbackOp.fileName} • {new Date(rollbackOp.timestamp).toLocaleString('ar-YE')}
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1">
              <span className="font-bold block">ماذا سيحدث عند التراجع؟</span>
              <p className="text-[11px] leading-relaxed text-rose-800">
                سيقوم النظام بحذف فقط السجلات التي أنشأتها هذه العملية ({rollbackOp.addedCount} سجل)، ولن يتم المساس بأي بيانات أخرى كانت مسجلة مسبقاً قبل عملية الاستيراد.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRollbackOp(null)}
                className="w-1/2 py-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                onClick={handleConfirmRollback}
                disabled={isRollbackLoading}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {isRollbackLoading ? 'جاري التراجع...' : 'تأكيد التراجع الآن'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
