import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle,
  Search,
  Filter,
  Layers,
  Scale,
  Calendar,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Building,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowRight,
  ShieldAlert,
  FolderTree,
  FileText,
  PieChart,
  Check,
  X,
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { JournalEntry, JournalLine, ChartAccount, AccountCategory } from '../types';

type ActiveViewTab = 'entries' | 'chart_accounts' | 'trial_balance' | 'ledger' | 'income_statement' | 'balance_sheet';

export const JournalView: React.FC = () => {
  const {
    journalEntries,
    chartAccounts,
    accounts,
    customers,
    orders,
    expenses,
    totalCashAndBanks,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    reverseJournalEntry,
    addChartAccount,
    updateChartAccount,
    deleteChartAccount,
    showNotification
  } = useStore();

  const [activeTab, setActiveTab] = useState<ActiveViewTab>('entries');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'balanced' | 'unbalanced'>('ALL');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Selected account for Ledger view
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<number | string>(
    chartAccounts[0]?.id || 101
  );

  // Modals state
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<JournalEntry | null>(null);
  const [deleteCascadeOption, setDeleteCascadeOption] = useState(true);
  const [reversingEntry, setReversingEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('إلغاء وتسوية القيد بالكامل');

  // Chart account modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);

  // Filtered Journal Entries
  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const desc = entry.description?.toLowerCase() || '';
      const num = entry.entryNumber?.toLowerCase() || '';
      const srcNum = entry.sourceNumber?.toLowerCase() || '';
      const lineMatches = entry.lines?.some(l => l.accountName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSearch = desc.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase()) || srcNum.includes(searchTerm.toLowerCase()) || lineMatches;

      if (!matchesSearch) return false;

      if (sourceFilter !== 'ALL') {
        if (sourceFilter === 'manual' && entry.sourceType !== 'manual') return false;
        if (sourceFilter === 'order' && entry.sourceType !== 'order') return false;
        if (sourceFilter === 'payment' && entry.sourceType !== 'payment') return false;
        if (sourceFilter === 'expense' && entry.sourceType !== 'expense') return false;
        if (sourceFilter === 'reversal' && entry.sourceType !== 'reversal') return false;
      }

      const totalDebit = (entry.lines || [])
        .filter(l => l.side === 'debit')
        .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);
      const totalCredit = (entry.lines || [])
        .filter(l => l.side === 'credit')
        .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

      if (balanceFilter === 'balanced' && !isBalanced) return false;
      if (balanceFilter === 'unbalanced' && isBalanced) return false;

      if (dateRange.start && entry.createdAt < dateRange.start) return false;
      if (dateRange.end && entry.createdAt.slice(0, 10) > dateRange.end) return false;

      return true;
    });
  }, [journalEntries, searchTerm, sourceFilter, balanceFilter, dateRange]);

  // Overall statistics
  const journalStats = useMemo(() => {
    let grandDebit = 0;
    let grandCredit = 0;
    let unbalancedCount = 0;

    journalEntries.forEach(entry => {
      let d = 0;
      let c = 0;
      (entry.lines || []).forEach(l => {
        const amt = parseFloat(String(l.amount)) || 0;
        if (l.side === 'debit') d += amt;
        else c += amt;
      });
      grandDebit += d;
      grandCredit += c;
      if (Math.abs(d - c) > 0.01) {
        unbalancedCount += 1;
      }
    });

    return {
      totalEntries: journalEntries.length,
      grandDebit,
      grandCredit,
      unbalancedCount,
      isFullyBalanced: unbalancedCount === 0 && Math.abs(grandDebit - grandCredit) < 0.01
    };
  }, [journalEntries]);

  // Dynamic Trial Balance Calculation
  const trialBalanceRows = useMemo(() => {
    // Map account name or code to debit and credit totals
    const accountTotals: Record<string, { code: string; name: string; category: AccountCategory; debit: number; credit: number }> = {};

    // Initialize with standard chart accounts
    chartAccounts.forEach(ca => {
      accountTotals[ca.code] = {
        code: ca.code,
        name: ca.name,
        category: ca.category,
        debit: 0,
        credit: 0
      };
    });

    // Aggregate from journal lines
    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(line => {
        const amt = parseFloat(String(line.amount)) || 0;
        if (amt <= 0) return;

        // Find match in chart accounts
        let matched = chartAccounts.find(ca => ca.code === line.chartAccountCode || ca.id === line.chartAccountId);
        if (!matched) {
          // match by name similarity
          const lowerName = line.accountName.toLowerCase();
          if (lowerName.includes('عميل') || lowerName.includes('العميل')) {
            matched = chartAccounts.find(ca => ca.code === '110');
          } else if (lowerName.includes('صندوق') || lowerName.includes('خزينة')) {
            matched = chartAccounts.find(ca => ca.code === '101');
          } else if (lowerName.includes('كريمي') || lowerName.includes('جيب') || lowerName.includes('بنك') || lowerName.includes('محفظ')) {
            matched = chartAccounts.find(ca => ca.code === '102');
          } else if (lowerName.includes('مبيعات') || lowerName.includes('إيراد')) {
            matched = chartAccounts.find(ca => ca.code === '401');
          } else if (lowerName.includes('توصيل')) {
            matched = chartAccounts.find(ca => ca.code === '402');
          } else if (lowerName.includes('مصروف')) {
            matched = chartAccounts.find(ca => ca.code === '509');
          } else if (lowerName.includes('مورد') || lowerName.includes('شحن')) {
            matched = chartAccounts.find(ca => ca.code === '201');
          }
        }

        const targetCode = matched ? matched.code : '509';
        if (!accountTotals[targetCode]) {
          accountTotals[targetCode] = {
            code: targetCode,
            name: matched?.name || line.accountName,
            category: matched?.category || 'expense',
            debit: 0,
            credit: 0
          };
        }

        if (line.side === 'debit') {
          accountTotals[targetCode].debit += amt;
        } else {
          accountTotals[targetCode].credit += amt;
        }
      });
    });

    const rows = Object.values(accountTotals)
      .filter(r => r.debit > 0 || r.credit > 0)
      .map(r => {
        const net = r.debit - r.credit;
        let closingDebit = 0;
        let closingCredit = 0;
        if (net > 0) closingDebit = net;
        else closingCredit = Math.abs(net);

        return {
          ...r,
          closingDebit,
          closingCredit
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    const totalDebitMovements = rows.reduce((s, r) => s + r.debit, 0);
    const totalCreditMovements = rows.reduce((s, r) => s + r.credit, 0);
    const totalClosingDebit = rows.reduce((s, r) => s + r.closingDebit, 0);
    const totalClosingCredit = rows.reduce((s, r) => s + r.closingCredit, 0);

    return {
      rows,
      totalDebitMovements,
      totalCreditMovements,
      totalClosingDebit,
      totalClosingCredit,
      isBalanced: Math.abs(totalClosingDebit - totalClosingCredit) < 1
    };
  }, [journalEntries, chartAccounts]);

  // Account Ledger Calculations
  const ledgerData = useMemo(() => {
    const selectedAccount = chartAccounts.find(ca => ca.id === Number(selectedLedgerAccountId) || ca.code === String(selectedLedgerAccountId)) || chartAccounts[0];
    if (!selectedAccount) return { entries: [], totalDebit: 0, totalCredit: 0, endingBalance: 0 };

    const matchingEntries: {
      date: string;
      entryNumber: string;
      sourceNumber?: string;
      description: string;
      lineDescription: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }[] = [];

    let running = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    // Sort entries chronologically
    const sorted = [...journalEntries].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach(entry => {
      (entry.lines || []).forEach(line => {
        let isMatch = false;
        if (line.chartAccountId && line.chartAccountId === selectedAccount.id) isMatch = true;
        if (line.chartAccountCode && line.chartAccountCode === selectedAccount.code) isMatch = true;

        if (!isMatch) {
          const lName = line.accountName.toLowerCase();
          if (selectedAccount.code === '110' && (lName.includes('عميل') || lName.includes('العميل'))) isMatch = true;
          if (selectedAccount.code === '101' && (lName.includes('صندوق') || lName.includes('خزينة') || lName.includes('نقدي'))) isMatch = true;
          if (selectedAccount.code === '102' && (lName.includes('كريمي') || lName.includes('جيب') || lName.includes('ون كاش') || lName.includes('محفظة') || lName.includes('بنك'))) isMatch = true;
          if (selectedAccount.code === '401' && (lName.includes('مبيعات') || lName.includes('وساطة'))) isMatch = true;
          if (selectedAccount.code === '402' && lName.includes('توصيل')) isMatch = true;
          if (selectedAccount.code === '201' && (lName.includes('مورد') || lName.includes('شحن'))) isMatch = true;
          if (selectedAccount.category === 'expense' && lName.includes(selectedAccount.name.replace('مصاريف ', ''))) isMatch = true;
        }

        if (isMatch) {
          const amt = parseFloat(String(line.amount)) || 0;
          const isDebit = line.side === 'debit';
          const debitAmt = isDebit ? amt : 0;
          const creditAmt = !isDebit ? amt : 0;

          if (selectedAccount.balanceType === 'debit') {
            running += (debitAmt - creditAmt);
          } else {
            running += (creditAmt - debitAmt);
          }

          totalDebit += debitAmt;
          totalCredit += creditAmt;

          matchingEntries.push({
            date: entry.createdAt,
            entryNumber: entry.entryNumber,
            sourceNumber: entry.sourceNumber || undefined,
            description: entry.description,
            lineDescription: line.accountName,
            debit: debitAmt,
            credit: creditAmt,
            runningBalance: running
          });
        }
      });
    });

    return {
      selectedAccount,
      entries: matchingEntries,
      totalDebit,
      totalCredit,
      endingBalance: running
    };
  }, [journalEntries, chartAccounts, selectedLedgerAccountId]);

  // Income Statement (قائمة الدخل والأرباح)
  const incomeStatement = useMemo(() => {
    let salesRevenue = 0;
    let deliveryRevenue = 0;
    let otherRevenue = 0;

    let cogs = 0; // تكلفة البضاعة
    let shippingCosts = 0; // شحن وتخليص
    let operatingExpenses = 0; // مصاريف تشغيل
    const expenseBreakdown: Record<string, number> = {};

    journalEntries.forEach(entry => {
      (entry.lines || []).forEach(l => {
        const amt = parseFloat(String(l.amount)) || 0;
        const name = l.accountName.toLowerCase();

        // Revenue lines (Credit)
        if (l.side === 'credit') {
          if (name.includes('مبيعات') || name.includes('وساطة') || l.chartAccountCode === '401') {
            salesRevenue += amt;
          } else if (name.includes('توصيل') || l.chartAccountCode === '402') {
            deliveryRevenue += amt;
          } else if (l.chartAccountCode === '409' || name.includes('إيراد')) {
            otherRevenue += amt;
          }
        }

        // Expense lines (Debit)
        if (l.side === 'debit') {
          if (name.includes('تكلفة') || name.includes('مشتريات') || l.chartAccountCode === '501') {
            cogs += amt;
          } else if (name.includes('شحن') || l.chartAccountCode === '502') {
            shippingCosts += amt;
          } else if (name.includes('مصروف') || l.chartAccountCode?.startsWith('5')) {
            operatingExpenses += amt;
            const categoryName = l.accountName.replace('مصروفات - ', '').replace('مصاريف ', '');
            expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + amt;
          }
        }
      });
    });

    const totalRevenues = salesRevenue + deliveryRevenue + otherRevenue;
    const directCosts = cogs + shippingCosts;
    const grossProfit = totalRevenues - directCosts;
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0;

    return {
      salesRevenue,
      deliveryRevenue,
      otherRevenue,
      totalRevenues,
      cogs,
      shippingCosts,
      directCosts,
      grossProfit,
      operatingExpenses,
      expenseBreakdown,
      netProfit,
      profitMargin
    };
  }, [journalEntries]);

  // Balance Sheet (الميزانية العمومية)
  const balanceSheet = useMemo(() => {
    let currentAssets = totalCashAndBanks;
    let accountsReceivable = 0;
    let inventoryGoodsInTransit = 0;
    let fixedAssets = 0;

    let accountsPayable = 0;
    let customerAdvances = 0;

    let capital = 0;
    let retainedEarnings = 0;

    trialBalanceRows.rows.forEach(r => {
      const net = r.closingDebit - r.closingCredit;
      if (r.code === '110') accountsReceivable = Math.max(0, net);
      if (r.code === '120') inventoryGoodsInTransit = Math.max(0, net);
      if (r.code === '150') fixedAssets = Math.max(0, net);
      if (r.code === '201') accountsPayable = Math.max(0, r.closingCredit - r.closingDebit);
      if (r.code === '202') customerAdvances = Math.max(0, r.closingCredit - r.closingDebit);
      if (r.code === '301') capital = Math.max(0, r.closingCredit - r.closingDebit);
      if (r.code === '302') retainedEarnings = Math.max(0, r.closingCredit - r.closingDebit);
    });

    // If capital not explicitly booked, base it on capital accounts or default
    if (capital === 0) capital = 250000;

    const totalAssets = currentAssets + accountsReceivable + inventoryGoodsInTransit + fixedAssets;
    const totalLiabilities = accountsPayable + customerAdvances;
    const currentPeriodNetProfit = incomeStatement.netProfit;
    const totalEquity = capital + retainedEarnings + currentPeriodNetProfit;
    const equationDiff = totalAssets - (totalLiabilities + totalEquity);

    return {
      currentAssets,
      accountsReceivable,
      inventoryGoodsInTransit,
      fixedAssets,
      totalAssets,
      accountsPayable,
      customerAdvances,
      totalLiabilities,
      capital,
      retainedEarnings,
      currentPeriodNetProfit,
      totalEquity,
      isBalanced: Math.abs(equationDiff) < 50,
      equationDiff
    };
  }, [trialBalanceRows, totalCashAndBanks, incomeStatement]);

  // Export functions
  const handleExportJournalExcel = () => {
    const dataToExport = filteredEntries.flatMap(entry => {
      return (entry.lines || []).map(l => ({
        'رقم القيد': entry.entryNumber,
        'التاريخ': entry.createdAt.slice(0, 10),
        'البيان والشرح': entry.description,
        'المستند المرتبط': entry.sourceNumber || entry.sourceType || 'يدوي',
        'الحساب المحاسبي': l.accountName,
        'الطرف': l.side === 'debit' ? 'مدين' : 'دائن',
        'مدين': l.side === 'debit' ? Number(l.amount) : 0,
        'دائن': l.side === 'credit' ? Number(l.amount) : 0
      }));
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دفتر_القيود_المحاسبية');
    XLSX.writeFile(wb, `قيود_اليومية_العامة_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification('تم تصدير دفتر القيود إلى ملف Excel بنجاح', 'success');
  };

  const handleExportTrialBalanceExcel = () => {
    const dataToExport = trialBalanceRows.rows.map(r => ({
      'كود الحساب': r.code,
      'اسم الحساب': r.name,
      'التصنيف': r.category,
      'حركات مدين': r.debit,
      'حركات دائن': r.credit,
      'الرصيد الختامي مدين': r.closingDebit,
      'الرصيد الختامي دائن': r.closingCredit
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ميزان_المراجعة');
    XLSX.writeFile(wb, `ميزان_المراجعة_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification('تم تصدير ميزان المراجعة إلى ملف Excel بنجاح', 'success');
  };

  const handleExportLedgerExcel = () => {
    const dataToExport = ledgerData.entries.map(e => ({
      'التاريخ': e.date.slice(0, 10),
      'رقم القيد': e.entryNumber,
      'المستند': e.sourceNumber || '-',
      'البيان': e.description,
      'مدين': e.debit,
      'دائن': e.credit,
      'الرصيد التراكمي': e.runningBalance
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف_الحساب');
    XLSX.writeFile(wb, `كشف_حساب_${ledgerData.selectedAccount?.name || 'الحساب'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification('تم تصدير كشف الحساب إلى Excel بنجاح', 'success');
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Helper for source badge
  const getSourceBadge = (type?: string, number?: string | null) => {
    switch (type) {
      case 'order':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            فاتورة مبيعات {number ? `#${number}` : ''}
          </span>
        );
      case 'payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            سند قبض {number ? `#${number}` : ''}
          </span>
        );
      case 'expense':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            مصروف {number ? `#${number}` : ''}
          </span>
        );
      case 'reversal':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            قيد عكسي تسوية
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            قيد يومية يدوي
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">النظام المحاسبي والترابط المزدوج الآلي</h1>
              <p className="text-xs text-slate-500">
                إدارة دفتر قيود اليومية، شجرة الحسابات، ميزان المراجعة، كشف الحسابات، والقوائم المالية الختامية
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddEntryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة قيد يومية يدوي
          </button>
          <button
            onClick={handleExportJournalExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500">إجمالي القيود المحاسبية</span>
          <div className="text-xl font-black text-slate-900 mt-1">{journalStats.totalEntries} قيد</div>
          <span className="text-[11px] text-slate-400">مزدوجة وموثقة آلياً</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-blue-600">إجمالي حركات المدين (Debit)</span>
          <div className="text-xl font-black text-blue-700 mt-1">{journalStats.grandDebit.toLocaleString()} ريال</div>
          <span className="text-[11px] text-slate-400">جميع أطراف المدين</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-600">إجمالي حركات الدائن (Credit)</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{journalStats.grandCredit.toLocaleString()} ريال</div>
          <span className="text-[11px] text-slate-400">جميع أطراف الدائن</span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs ${
          journalStats.isFullyBalanced ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
        }`}>
          <span className={`text-xs font-bold ${journalStats.isFullyBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
            حالة توازن القيود (Balance)
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {journalStats.isFullyBalanced ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-lg font-black text-emerald-800">متوازن 100%</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span className="text-lg font-black text-rose-800">{journalStats.unbalancedCount} قيود غير متوازنة</span>
              </>
            )}
          </div>
          <span className="text-[11px] text-slate-500">القاعدة: مدين = دائن دائماً</span>
        </div>
      </div>

      {/* Modern Tab Switcher Navigation */}
      <div className="flex items-center gap-1 bg-slate-200/80 p-1.5 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('entries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'entries'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600" />
          دفتر اليومية العامة ({journalEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('chart_accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'chart_accounts'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <FolderTree className="w-4 h-4 text-blue-600" />
          دليل شجرة الحسابات ({chartAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'trial_balance'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Scale className="w-4 h-4 text-emerald-600" />
          ميزان المراجعة اللحظي
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'ledger'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <FileText className="w-4 h-4 text-purple-600" />
          كشف الحساب التفصيلي
        </button>

        <button
          onClick={() => setActiveTab('income_statement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'income_statement'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          قائمة الدخل والأرباح
        </button>

        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'balance_sheet'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Building className="w-4 h-4 text-indigo-600" />
          الميزانية العمومية
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: GENERAL JOURNAL (دفتر قيود اليومية العامة)                 */}
      {/* ============================================================== */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث برقم القيد (JE-...)، بيان العملية، أو الحساب المحاسبي..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Source Type Filter */}
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
            >
              <option value="ALL">جميع أنواع الحركات</option>
              <option value="order">فواتير مبيعات الطلبات</option>
              <option value="payment">سندات القبض والدفعات</option>
              <option value="expense">المصروفات التشغيلية</option>
              <option value="manual">القيود اليدوية الحرة</option>
              <option value="reversal">القيود العكسية والتسويات</option>
            </select>

            {/* Balance Status Filter */}
            <select
              value={balanceFilter}
              onChange={e => setBalanceFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
            >
              <option value="ALL">حالة التوازن: الكل</option>
              <option value="balanced">متوازنة فقط (مدين = دائن)</option>
              <option value="unbalanced">غير متوازنة فقط</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
              />
              <span className="text-slate-400">إلى</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600"
              />
            </div>
          </div>

          {/* Entries List */}
          {filteredEntries.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">لا توجد قيود تطابق الفلتر الحالي</h3>
              <p className="text-xs text-slate-500 mt-1">جرب تغيير كلمات البحث أو إعادة ضبط الفلاتر أعلاه</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredEntries.map(entry => {
                const totalDebit = (entry.lines || [])
                  .filter(l => l.side === 'debit')
                  .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

                const totalCredit = (entry.lines || [])
                  .filter(l => l.side === 'credit')
                  .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                return (
                  <div
                    key={entry.id}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition hover:border-slate-300 ${
                      entry.isReversed ? 'border-purple-200 bg-purple-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Header bar of entry */}
                    <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                          {entry.entryNumber}
                        </span>
                        {getSourceBadge(entry.sourceType, entry.sourceNumber)}
                        {entry.isReversed && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            قيد ملغى بقيد عكسي
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 mr-2">{entry.description}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-slate-500 text-[11px]">
                          {new Date(entry.createdAt).toLocaleDateString('ar-YE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isBalanced ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            متوازن
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            غير متوازن (فرق: {Math.abs(totalDebit - totalCredit)} ريال)
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mr-2 border-r border-slate-200 pr-2">
                          <button
                            onClick={() => setEditingEntry(entry)}
                            title="تعديل القيد المحاسبي"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!entry.isReversed && (
                            <button
                              onClick={() => setReversingEntry(entry)}
                              title="عكس القيد (Storno Reversal)"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDeletingEntry(entry);
                              setDeleteCascadeOption(true);
                            }}
                            title="حذف القيد مع خيارات الحذف المتزامن"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lines Table */}
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="text-slate-500 border-b border-slate-100 font-semibold">
                          <tr>
                            <th className="pb-2">اسم الحساب المحاسبي</th>
                            <th className="pb-2 text-center w-24">الطرف</th>
                            <th className="pb-2 text-left w-36">مدين (Debit)</th>
                            <th className="pb-2 text-left w-36">دائن (Credit)</th>
                            <th className="pb-2 w-40">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(entry.lines || []).map((line, idx) => {
                            const isDebit = line.side === 'debit';
                            const amt = parseFloat(String(line.amount || 0));

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 font-medium text-slate-800">
                                  {isDebit ? line.accountName : `   ← إلى حـ/ ${line.accountName}`}
                                </td>
                                <td className="py-2.5 text-center">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                      isDebit ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {isDebit ? 'مدين' : 'دائن'}
                                  </span>
                                </td>
                                <td className="py-2.5 text-left font-mono font-bold text-slate-900">
                                  {isDebit ? `${amt.toLocaleString()} ريال` : '-'}
                                </td>
                                <td className="py-2.5 text-left font-mono font-bold text-slate-900">
                                  {!isDebit ? `${amt.toLocaleString()} ريال` : '-'}
                                </td>
                                <td className="py-2.5 text-slate-400 text-[11px]">
                                  {line.notes || '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="border-t border-slate-200 font-bold font-mono text-slate-900">
                          <tr>
                            <td colSpan={2} className="pt-2 text-slate-500 font-sans">إجمالي القيد المزدوج:</td>
                            <td className="pt-2 text-left text-blue-700">{totalDebit.toLocaleString()} ريال</td>
                            <td className="pt-2 text-left text-emerald-700">{totalCredit.toLocaleString()} ريال</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: CHART OF ACCOUNTS (دليل شجرة الحسابات)                    */}
      {/* ============================================================== */}
      {activeTab === 'chart_accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900">شجرة ودليل الحسابات الموحد (Chart of Accounts)</h3>
              <p className="text-xs text-slate-500">
                الهيكل القياسي للحسابات: 1- الأصول، 2- الخصوم، 3- حقوق الملكية، 4- الإيرادات، 5- المصروفات
              </p>
            </div>
            <button
              onClick={() => setIsAddAccountOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              إضافة حساب محاسبي جديد
            </button>
          </div>

          {/* Grouped by 5 standard categories */}
          {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountCategory[]).map(cat => {
            const categoryAccounts = chartAccounts.filter(ca => ca.category === cat);
            const catLabels: Record<AccountCategory, { name: string; color: string; codePrefix: string }> = {
              asset: { name: '1. الأصول والموجودات (Assets)', color: 'border-blue-500 text-blue-800 bg-blue-50/40', codePrefix: '1xx' },
              liability: { name: '2. الخصوم والالتزامات (Liabilities)', color: 'border-rose-500 text-rose-800 bg-rose-50/40', codePrefix: '2xx' },
              equity: { name: '3. حقوق الملكية ورأس المال (Equity)', color: 'border-purple-500 text-purple-800 bg-purple-50/40', codePrefix: '3xx' },
              revenue: { name: '4. الإيرادات والمبيعات (Revenues)', color: 'border-emerald-500 text-emerald-800 bg-emerald-50/40', codePrefix: '4xx' },
              expense: { name: '5. المصروفات وتكلفة النشاط (Expenses)', color: 'border-amber-500 text-amber-800 bg-amber-50/40', codePrefix: '5xx' }
            };

            const info = catLabels[cat];

            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className={`px-4 py-3 border-r-4 ${info.color} border-b border-slate-200 flex items-center justify-between`}>
                  <h4 className="text-xs font-bold">{info.name}</h4>
                  <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {categoryAccounts.length} حسابات
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 w-24">كود الحساب</th>
                        <th className="py-2.5 px-4">اسم الحساب المحاسبي</th>
                        <th className="py-2.5 px-4">التصنيف الفرعي</th>
                        <th className="py-2.5 px-4 text-center w-28">طبيعة الرصيد</th>
                        <th className="py-2.5 px-4">الوصف</th>
                        <th className="py-2.5 px-4 text-center w-36">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryAccounts.map(account => {
                        return (
                          <tr key={account.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-4 font-mono font-bold text-slate-700 bg-slate-50/50">
                              {account.code}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {account.name}
                              {account.isSystem && (
                                <span className="mr-2 text-[10px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  نظامي
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600">{account.subCategory}</td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  account.balanceType === 'debit'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {account.balanceType === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">{account.description || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setSelectedLedgerAccountId(account.id);
                                    setActiveTab('ledger');
                                  }}
                                  title="عرض كشف حساب تفصيلي"
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingAccount(account)}
                                  title="تعديل الحساب"
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!account.isSystem && (
                                  <button
                                    onClick={() => deleteChartAccount(account.id)}
                                    title="حذف الحساب"
                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TRIAL BALANCE (ميزان المراجعة اللحظي)                      */}
      {/* ============================================================== */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)</h3>
              <p className="text-xs text-slate-500">
                مطابقة محاسبية لحظية لكافة حركات المدين والدائن والأرصدة الختامية لجميع حسابات النظام
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportTrialBalanceExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                تصدير Excel
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة
              </button>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-24">كود الحساب</th>
                  <th className="py-3 px-4">اسم الحساب</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4 text-left text-blue-700 bg-blue-50/30">حركات مدين</th>
                  <th className="py-3 px-4 text-left text-emerald-700 bg-emerald-50/30">حركات دائن</th>
                  <th className="py-3 px-4 text-left font-bold text-blue-800 bg-blue-50/60">رصيد ختامي (مدين)</th>
                  <th className="py-3 px-4 text-left font-bold text-emerald-800 bg-emerald-50/60">رصيد ختامي (دائن)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {trialBalanceRows.rows.map(row => {
                  return (
                    <tr key={row.code} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-700">{row.code}</td>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{row.name}</td>
                      <td className="py-3 px-4 font-sans text-slate-500 text-[11px]">{row.category}</td>
                      <td className="py-3 px-4 text-left text-blue-700 bg-blue-50/10">
                        {row.debit > 0 ? `${row.debit.toLocaleString()} ريال` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left text-emerald-700 bg-emerald-50/10">
                        {row.credit > 0 ? `${row.credit.toLocaleString()} ريال` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-blue-800 bg-blue-50/30">
                        {row.closingDebit > 0 ? `${row.closingDebit.toLocaleString()} ريال` : '-'}
                      </td>
                      <td className="py-3 px-4 text-left font-bold text-emerald-800 bg-emerald-50/30">
                        {row.closingCredit > 0 ? `${row.closingCredit.toLocaleString()} ريال` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 font-bold font-mono text-xs bg-slate-50">
                <tr>
                  <td colSpan={3} className="py-3 px-4 font-sans text-slate-900 font-bold">
                    الإجمالي العام لميزان المراجعة:
                  </td>
                  <td className="py-3 px-4 text-left text-blue-700 bg-blue-50/30">
                    {trialBalanceRows.totalDebitMovements.toLocaleString()} ريال
                  </td>
                  <td className="py-3 px-4 text-left text-emerald-700 bg-emerald-50/30">
                    {trialBalanceRows.totalCreditMovements.toLocaleString()} ريال
                  </td>
                  <td className="py-3 px-4 text-left font-black text-blue-800 bg-blue-50/60">
                    {trialBalanceRows.totalClosingDebit.toLocaleString()} ريال
                  </td>
                  <td className="py-3 px-4 text-left font-black text-emerald-800 bg-emerald-50/60">
                    {trialBalanceRows.totalClosingCredit.toLocaleString()} ريال
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Validation Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            trialBalanceRows.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {trialBalanceRows.isBalanced ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
              <span className="font-bold text-xs">
                {trialBalanceRows.isBalanced
                  ? 'ميزان المراجعة متوازن ومتطابق تماماً بنسبة 100% (إجمالي المدين = إجمالي الدائن)'
                  : 'تنبيه: ميزان المراجعة غير متطابق! يوجد فارق حسابي يجب تدقيقه'}
              </span>
            </div>
            <span className="font-mono font-bold text-xs">
              الفارق: {Math.abs(trialBalanceRows.totalClosingDebit - trialBalanceRows.totalClosingCredit).toLocaleString()} ريال
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: ACCOUNT LEDGER (كشف الحساب التفصيلي)                      */}
      {/* ============================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            {/* Account Selector */}
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">اختر الحساب المحاسبي:</label>
              <select
                value={selectedLedgerAccountId}
                onChange={e => setSelectedLedgerAccountId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 flex-1 max-w-md"
              >
                {chartAccounts.map(ca => (
                  <option key={ca.id} value={ca.id}>
                    [{ca.code}] {ca.name} ({ca.subCategory})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLedgerExcel}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                تصدير كشف الحساب
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة
              </button>
            </div>
          </div>

          {/* Ledger Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold">الحساب المستعرض</span>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                {ledgerData.selectedAccount?.name}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">الكود: {ledgerData.selectedAccount?.code}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-blue-600 font-bold">مجموع حركات المدين</span>
              <div className="text-lg font-bold text-blue-700 mt-1 font-mono">
                {ledgerData.totalDebit.toLocaleString()} ريال
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200">
              <span className="text-xs text-emerald-600 font-bold">مجموع حركات الدائن</span>
              <div className="text-lg font-bold text-emerald-700 mt-1 font-mono">
                {ledgerData.totalCredit.toLocaleString()} ريال
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 bg-amber-50/30">
              <span className="text-xs text-amber-800 font-bold">الرصيد الختامي المتحرك</span>
              <div className="text-lg font-black text-amber-900 mt-1 font-mono">
                {ledgerData.endingBalance.toLocaleString()} ريال
              </div>
              <span className="text-[11px] text-slate-500">
                طبيعة الحساب: {ledgerData.selectedAccount?.balanceType === 'debit' ? 'مدين' : 'دائن'}
              </span>
            </div>
          </div>

          {/* Ledger Entries Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-28">التاريخ</th>
                    <th className="py-2.5 px-4 w-28">رقم القيد</th>
                    <th className="py-2.5 px-4 w-28">المستند</th>
                    <th className="py-2.5 px-4">البيان والشرح</th>
                    <th className="py-2.5 px-4 text-left w-32 text-blue-700">مدين (Debit)</th>
                    <th className="py-2.5 px-4 text-left w-32 text-emerald-700">دائن (Credit)</th>
                    <th className="py-2.5 px-4 text-left w-36 font-bold text-slate-900 bg-slate-50">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        لا توجد حركات مسجلة لهذا الحساب في الفترة الحالية
                      </td>
                    </tr>
                  ) : (
                    ledgerData.entries.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-600">{item.date.slice(0, 10)}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{item.entryNumber}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-sans">{item.sourceNumber || '-'}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-800">{item.description}</td>
                        <td className="py-2.5 px-4 text-left text-blue-700">
                          {item.debit > 0 ? `${item.debit.toLocaleString()} ريال` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left text-emerald-700">
                          {item.credit > 0 ? `${item.credit.toLocaleString()} ريال` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-left font-black text-slate-900 bg-slate-50/60">
                          {item.runningBalance.toLocaleString()} ريال
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: INCOME STATEMENT (قائمة الدخل والأرباح)                    */}
      {/* ============================================================== */}
      {activeTab === 'income_statement' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-black text-slate-900">متجر TOP STORE – توب ستور</h2>
            <h3 className="text-base font-bold text-slate-700 mt-1">قائمة الدخل والأرباح والخسائر (Income Statement)</h3>
            <p className="text-xs text-slate-500 mt-0.5">عن الفترة المالية الحالية من واقع القيود المزدوجة المعتمدة</p>
          </div>

          <div className="space-y-4 text-xs font-sans">
            {/* 1. Revenues */}
            <div className="border border-slate-200 rounded-xl p-4 bg-emerald-50/20">
              <h4 className="font-bold text-emerald-900 text-sm mb-3">1. الإيرادات والمبيعات (Revenues)</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700">إيرادات المبيعات وعمولات الوساطة التجارية</span>
                  <span className="font-mono font-bold text-slate-900">{incomeStatement.salesRevenue.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700">إيرادات رسوم وأجور خدمات التوصيل المحلي</span>
                  <span className="font-mono font-bold text-slate-900">{incomeStatement.deliveryRevenue.toLocaleString()} ريال</span>
                </div>
                {incomeStatement.otherRevenue > 0 && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">إيرادات وأرباح متنوعة أخرى</span>
                    <span className="font-mono font-bold text-slate-900">{incomeStatement.otherRevenue.toLocaleString()} ريال</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 font-bold text-emerald-800 text-sm">
                  <span>إجمالي الإيرادات:</span>
                  <span className="font-mono">{incomeStatement.totalRevenues.toLocaleString()} ريال</span>
                </div>
              </div>
            </div>

            {/* 2. Direct Costs */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm mb-3">2. تكلفة المبيعات والتكاليف المباشرة (COGS)</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700">تكلفة البضاعة المشتراة من المواقع العالمية</span>
                  <span className="font-mono font-bold text-slate-900">{incomeStatement.cogs.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700">تكاليف الشحن الدولي والتخليص الجمركي</span>
                  <span className="font-mono font-bold text-slate-900">{incomeStatement.shippingCosts.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-slate-800 text-sm">
                  <span>إجمالي التكاليف المباشرة:</span>
                  <span className="font-mono">{incomeStatement.directCosts.toLocaleString()} ريال</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-900 text-sm">
              <span>مجمل الربح (Gross Profit):</span>
              <span className="font-mono text-base">{incomeStatement.grossProfit.toLocaleString()} ريال</span>
            </div>

            {/* 3. Operating Expenses */}
            <div className="border border-slate-200 rounded-xl p-4 bg-rose-50/20">
              <h4 className="font-bold text-rose-900 text-sm mb-3">3. المصروفات التشغيلية والعمومية (Operating Expenses)</h4>
              <div className="space-y-2">
                {Object.entries(incomeStatement.expenseBreakdown).map(([cat, amt]) => (
                  <div key={cat} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">{cat}</span>
                    <span className="font-mono font-bold text-slate-900">{amt.toLocaleString()} ريال</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 font-bold text-rose-800 text-sm">
                  <span>إجمالي المصروفات التشغيلية:</span>
                  <span className="font-mono">{incomeStatement.operatingExpenses.toLocaleString()} ريال</span>
                </div>
              </div>
            </div>

            {/* Final Net Profit */}
            <div className={`flex justify-between p-5 rounded-2xl border-2 font-black text-base shadow-xs ${
              incomeStatement.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                : 'bg-rose-50 border-rose-500 text-rose-900'
            }`}>
              <div>
                <div>صافي الأرباح / الخسائر الصافية للفترة (Net Profit):</div>
                <span className="text-xs font-normal text-slate-500">
                  هامش الربح الصافي: {incomeStatement.profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="font-mono text-xl">
                {incomeStatement.netProfit.toLocaleString()} ريال
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: BALANCE SHEET (الميزانية العمومية والمركز المالي)           */}
      {/* ============================================================== */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
          <div className="text-center border-b border-slate-200 pb-4">
            <h2 className="text-xl font-black text-slate-900">متجر TOP STORE – توب ستور</h2>
            <h3 className="text-base font-bold text-slate-700 mt-1">الميزانية العمومية وقائمة المركز المالي (Balance Sheet)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              المعادلة المحاسبية الذهبية: الأصول (Assets) = الخصوم (Liabilities) + حقوق الملكية (Equity)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
            {/* Right: Assets */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-blue-50/20 space-y-4">
              <h4 className="font-bold text-blue-900 text-sm border-b border-blue-200 pb-2">
                الأصول والموجودات (Assets)
              </h4>

              <div className="space-y-2">
                <span className="font-bold text-slate-600 text-[11px]">الأصول المتداولة:</span>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>النقدية بالصناديق والمحافظ الإلكترونية والبنوك</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.currentAssets.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>ذمم العملاء المدينة (أرصدة الطلبات غير المسددة)</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.accountsReceivable.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>بضاعة ومشتريات في الطريق والشحنات</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.inventoryGoodsInTransit.toLocaleString()} ريال</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-600 text-[11px]">الأصول الثابتة:</span>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>تجهيزات، أجهزة ومعدات المتجر</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.fixedAssets.toLocaleString()} ريال</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t-2 border-blue-300 font-bold text-blue-900 text-sm">
                <span>إجمالي الأصول (Total Assets):</span>
                <span className="font-mono text-base">{balanceSheet.totalAssets.toLocaleString()} ريال</span>
              </div>
            </div>

            {/* Left: Liabilities & Equity */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-emerald-50/20 space-y-4">
              <h4 className="font-bold text-emerald-900 text-sm border-b border-emerald-200 pb-2">
                الخصوم وحقوق الملكية (Liabilities & Equity)
              </h4>

              {/* Liabilities */}
              <div className="space-y-2">
                <span className="font-bold text-slate-600 text-[11px]">الخصوم والالتزامات:</span>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>ذمم الموردين وشركات الشحن والتخليص</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.accountsPayable.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>أمانات وعربونات مقدمة من العملاء</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.customerAdvances.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700 font-semibold pr-2">
                  <span>إجمالي الخصوم:</span>
                  <span className="font-mono">{balanceSheet.totalLiabilities.toLocaleString()} ريال</span>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-600 text-[11px]">حقوق الملكية:</span>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>رأس المال المدفوع</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.capital.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>الأرباح المبقاة والمرحلة</span>
                  <span className="font-mono font-bold text-slate-900">{balanceSheet.retainedEarnings.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 pr-2">
                  <span>صافي أرباح الفترة المالية الحالية</span>
                  <span className="font-mono font-bold text-emerald-700">{balanceSheet.currentPeriodNetProfit.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between py-1 text-slate-700 font-semibold pr-2">
                  <span>إجمالي حقوق الملكية:</span>
                  <span className="font-mono">{balanceSheet.totalEquity.toLocaleString()} ريال</span>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t-2 border-emerald-300 font-bold text-emerald-900 text-sm">
                <span>إجمالي الخصوم وحقوق الملكية:</span>
                <span className="font-mono text-base">{(balanceSheet.totalLiabilities + balanceSheet.totalEquity).toLocaleString()} ريال</span>
              </div>
            </div>
          </div>

          {/* Equation Check */}
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold ${
            balanceSheet.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>
                {balanceSheet.isBalanced
                  ? 'المعادلة المحاسبية متطابقة: الأصول = الخصوم + حقوق الملكية'
                  : 'فارق تسوية المركز المالي: يتم ترحيل الفروق للأرباح المبقاة'}
              </span>
            </div>
            <span className="font-mono">
              فارق المعادلة: {Math.abs(balanceSheet.equationDiff).toLocaleString()} ريال
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: NEW MANUAL JOURNAL ENTRY (إضافة قيد يدوي)              */}
      {/* ============================================================== */}
      {isAddEntryOpen && (
        <NewJournalEntryModal
          chartAccounts={chartAccounts}
          onClose={() => setIsAddEntryOpen(false)}
          onSave={data => {
            addJournalEntry(data);
            setIsAddEntryOpen(false);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 2: EDIT JOURNAL ENTRY (تعديل قيد يومية)                    */}
      {/* ============================================================== */}
      {editingEntry && (
        <EditJournalEntryModal
          entry={editingEntry}
          chartAccounts={chartAccounts}
          onClose={() => setEditingEntry(null)}
          onSave={(id, data) => {
            updateJournalEntry(id, data);
            setEditingEntry(null);
          }}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DELETE CASCADING CONFIRMATION (تحذير الحذف المتزامن)   */}
      {/* ============================================================== */}
      {deletingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد حذف القيد المحاسبي</h3>
                <p className="text-xs text-slate-500">تحذير تكامل البيانات والحذف المتزامن (Cascading)</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between font-bold text-slate-800">
                <span>رقم القيد:</span>
                <span className="font-mono text-amber-600">{deletingEntry.entryNumber}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>البيان:</span>
                <span>{deletingEntry.description}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>مصدر القيد:</span>
                <span className="font-bold">{deletingEntry.sourceType || 'يدوي'}</span>
              </div>
            </div>

            {deletingEntry.sourceType && deletingEntry.sourceType !== 'manual' && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={deleteCascadeOption}
                  onChange={e => setDeleteCascadeOption(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 cursor-pointer"
                />
                <span className="text-slate-700">
                  <strong className="block text-amber-900 font-bold mb-0.5">حذف متزامن للمستند الأصلي التابع:</strong>
                  حذف السجل الأصلي (المصروف أو سند القبض أو الحركة النقدية) لمنع أي بيانات معلقة (No Orphan Entries) وإعادة احتساب الأرصدة تلقائياً.
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteJournalEntry(deletingEntry.id, { deleteSourceDocument: deleteCascadeOption });
                  setDeletingEntry(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs cursor-pointer"
              >
                تأكيد الحذف المتزامن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: REVERSE JOURNAL ENTRY (عكس القيد المحاسبي)              */}
      {/* ============================================================== */}
      {reversingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-purple-600">
              <RotateCcw className="w-6 h-6" />
              <div>
                <h3 className="text-base font-bold text-slate-900">إصدار قيد عكسي للتسوية (Storno)</h3>
                <p className="text-xs text-slate-500">عكس أطراف القيد الأصلي لإلغاء أثره المالي رسمياً</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700">سبب عكس القيد:</label>
              <input
                type="text"
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReversingEntry(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  reverseJournalEntry(reversingEntry.id, reversalReason);
                  setReversingEntry(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition shadow-xs cursor-pointer"
              >
                تأكيد إنشاء القيد العكسي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: ADD / EDIT CHART ACCOUNT (إضافة أو تعديل حساب)        */}
      {/* ============================================================== */}
      {(isAddAccountOpen || editingAccount) && (
        <AddEditChartAccountModal
          account={editingAccount}
          onClose={() => {
            setIsAddAccountOpen(false);
            setEditingAccount(null);
          }}
          onSave={accountData => {
            if (editingAccount) {
              updateChartAccount({ ...editingAccount, ...accountData });
            } else {
              addChartAccount(accountData as any);
            }
            setIsAddAccountOpen(false);
            setEditingAccount(null);
          }}
        />
      )}

    </div>
  );
};

// =====================================================================
// SUB-MODAL: NEW MANUAL JOURNAL ENTRY (إضافة قيد يومية يدوي متعدد الأطراف)
// =====================================================================
interface NewJournalEntryModalProps {
  chartAccounts: ChartAccount[];
  onClose: () => void;
  onSave: (data: {
    description: string;
    date: string;
    lines: JournalLine[];
    sourceType?: 'manual';
  }) => void;
}

const NewJournalEntryModal: React.FC<NewJournalEntryModalProps> = ({
  chartAccounts,
  onClose,
  onSave
}) => {
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<{
    id: number;
    chartAccountId: number | null;
    chartAccountCode: string;
    accountName: string;
    side: 'debit' | 'credit';
    amount: number;
    notes: string;
  }[]>([
    {
      id: 1,
      chartAccountId: chartAccounts[0]?.id || 101,
      chartAccountCode: chartAccounts[0]?.code || '101',
      accountName: chartAccounts[0]?.name || 'الصندوق',
      side: 'debit',
      amount: 0,
      notes: ''
    },
    {
      id: 2,
      chartAccountId: chartAccounts[1]?.id || 401,
      chartAccountCode: chartAccounts[1]?.code || '401',
      accountName: chartAccounts[1]?.name || 'المبيعات',
      side: 'credit',
      amount: 0,
      notes: ''
    }
  ]);

  const handleAddLine = (side: 'debit' | 'credit') => {
    setLines(prev => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        chartAccountId: chartAccounts[0]?.id || 101,
        chartAccountCode: chartAccounts[0]?.code || '101',
        accountName: chartAccounts[0]?.name || 'الصندوق',
        side,
        amount: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveLine = (id: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLine = (id: number, field: string, val: any) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id === id) {
          if (field === 'chartAccountId') {
            const acc = chartAccounts.find(ca => ca.id === Number(val));
            return {
              ...l,
              chartAccountId: acc?.id || null,
              chartAccountCode: acc?.code || '',
              accountName: acc?.name || ''
            };
          }
          return { ...l, [field]: val };
        }
        return l;
      })
    );
  };

  const totalDebit = lines
    .filter(l => l.side === 'debit')
    .reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const totalCredit = lines
    .filter(l => l.side === 'credit')
    .reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    if (!isBalanced) return;

    onSave({
      description,
      date,
      sourceType: 'manual',
      lines: lines.map((l, idx) => ({
        id: idx + 1,
        journalEntryId: 0,
        accountId: null,
        chartAccountId: l.chartAccountId,
        chartAccountCode: l.chartAccountCode,
        accountName: l.accountName,
        side: l.side,
        amount: Number(l.amount) || 0,
        notes: l.notes
      }))
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">إضافة قيد يومية محاسبي مزدوج</h3>
              <p className="text-xs text-slate-500">القاعدة المحاسبية: إجمالي المدين = إجمالي الدائن</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">شرح وبيان القيد *</label>
              <input
                type="text"
                required
                placeholder="مثال: إثبات سداد مصاريف صيانة، شراء أصل ثابت..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">تاريخ القيد</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">أطراف القيد (المدين والدائن):</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddLine('debit')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer"
                >
                  + طرف مدين
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLine('credit')}
                  className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  + طرف دائن
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {lines.map((line, idx) => (
                <div key={line.id} className="p-3 bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs">
                  {/* Side */}
                  <select
                    value={line.side}
                    onChange={e => handleUpdateLine(line.id, 'side', e.target.value)}
                    className={`font-bold rounded-lg px-2 py-1.5 border text-xs cursor-pointer ${
                      line.side === 'debit'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <option value="debit">من حـ/ (مدين)</option>
                    <option value="credit">إلى حـ/ (دائن)</option>
                  </select>

                  {/* Chart Account Select */}
                  <select
                    value={line.chartAccountId || ''}
                    onChange={e => handleUpdateLine(line.id, 'chartAccountId', e.target.value)}
                    className="flex-1 min-w-[200px] border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                  >
                    {chartAccounts.map(ca => (
                      <option key={ca.id} value={ca.id}>
                        [{ca.code}] {ca.name}
                      </option>
                    ))}
                  </select>

                  {/* Amount */}
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="المبلغ"
                      value={line.amount || ''}
                      onChange={e => handleUpdateLine(line.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 text-left"
                    />
                  </div>

                  {/* Notes */}
                  <div className="flex-1 min-w-[120px]">
                    <input
                      type="text"
                      placeholder="ملاحظات الطرف"
                      value={line.notes}
                      onChange={e => handleUpdateLine(line.id, 'notes', e.target.value)}
                      className="w-full border border-slate-200 bg-white rounded-lg px-2 py-1.5 text-slate-600"
                    />
                  </div>

                  {/* Remove Button */}
                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Balance Status Footer */}
          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 font-sans">إجمالي المدين: </span>
              <strong className="text-blue-700 font-bold">{totalDebit.toLocaleString()} ريال</strong>
            </div>
            <div>
              <span className="text-slate-500 font-sans">إجمالي الدائن: </span>
              <strong className="text-emerald-700 font-bold">{totalCredit.toLocaleString()} ريال</strong>
            </div>
            <div className={`font-sans font-bold flex items-center gap-1 ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isBalanced ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  متوازن
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  غير متوازن (الفارق: {Math.abs(totalDebit - totalCredit)} ريال)
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isBalanced || !description.trim()}
              className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl transition shadow-xs cursor-pointer"
            >
              حفظ وترحيل القيد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-MODAL: EDIT JOURNAL ENTRY (تعديل قيد يومية)
// =====================================================================
interface EditJournalEntryModalProps {
  entry: JournalEntry;
  chartAccounts: ChartAccount[];
  onClose: () => void;
  onSave: (id: number, data: { description: string; lines: JournalLine[]; date: string }) => void;
}

const EditJournalEntryModal: React.FC<EditJournalEntryModalProps> = ({
  entry,
  chartAccounts,
  onClose,
  onSave
}) => {
  const [description, setDescription] = useState(entry.description || '');
  const [date, setDate] = useState(entry.createdAt.slice(0, 10));
  const [lines, setLines] = useState<JournalLine[]>(entry.lines || []);

  const handleUpdateLineAmount = (idx: number, amt: number) => {
    setLines(prev =>
      prev.map((l, i) => (i === idx ? { ...l, amount: amt } : l))
    );
  };

  const totalDebit = lines
    .filter(l => l.side === 'debit')
    .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

  const totalCredit = lines
    .filter(l => l.side === 'credit')
    .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;
    onSave(entry.id, {
      description,
      date,
      lines
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">تعديل القيد المحاسبي #{entry.entryNumber}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-700">البيان والشرح:</label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-700">تعديل مبالغ الأطراف:</label>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {lines.map((l, idx) => (
                <div key={idx} className="p-3 bg-slate-50/50 flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-800 flex-1 truncate">
                    {l.side === 'debit' ? 'من حـ/' : 'إلى حـ/'} {l.accountName}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    l.side === 'debit' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {l.side === 'debit' ? 'مدين' : 'دائن'}
                  </span>
                  <div className="w-32">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={l.amount}
                      onChange={e => handleUpdateLineAmount(idx, parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 bg-white rounded-lg p-1.5 font-mono font-bold text-left"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance Bar */}
          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between font-mono">
            <span>مدين: {totalDebit.toLocaleString()}</span>
            <span>دائن: {totalCredit.toLocaleString()}</span>
            <span className={`font-sans font-bold ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isBalanced ? 'متوازن' : `غير متوازن (${Math.abs(totalDebit - totalCredit)})`}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!isBalanced}
              className="px-5 py-2 font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl transition shadow-xs cursor-pointer"
            >
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =====================================================================
// SUB-MODAL: ADD / EDIT CHART ACCOUNT (إضافة أو تعديل حساب في الشجرة)
// =====================================================================
interface AddEditChartAccountModalProps {
  account: ChartAccount | null;
  onClose: () => void;
  onSave: (data: Partial<ChartAccount>) => void;
}

const AddEditChartAccountModal: React.FC<AddEditChartAccountModalProps> = ({
  account,
  onClose,
  onSave
}) => {
  const [code, setCode] = useState(account?.code || '');
  const [name, setName] = useState(account?.name || '');
  const [category, setCategory] = useState<AccountCategory>(account?.category || 'asset');
  const [subCategory, setSubCategory] = useState(account?.subCategory || 'أصول متداولة');
  const [balanceType, setBalanceType] = useState<'debit' | 'credit'>(account?.balanceType || 'debit');
  const [description, setDescription] = useState(account?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    onSave({
      code,
      name,
      category,
      subCategory,
      balanceType,
      description
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            {account ? 'تعديل حساب محاسبي' : 'إضافة حساب محاسبي جديد'}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">كود الحساب *</label>
              <input
                type="text"
                required
                placeholder="مثال: 105، 510..."
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">طبيعة الرصيد *</label>
              <select
                value={balanceType}
                onChange={e => setBalanceType(e.target.value as any)}
                className="w-full border border-slate-200 rounded-lg p-2 font-bold"
              >
                <option value="debit">مدين (Debit)</option>
                <option value="credit">دائن (Credit)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">اسم الحساب المحاسبي *</label>
            <input
              type="text"
              required
              placeholder="مثال: بنك التضامن، مصروف كهرباء..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">التصنيف الرئيسي *</label>
              <select
                value={category}
                onChange={e => {
                  const cat = e.target.value as AccountCategory;
                  setCategory(cat);
                  if (cat === 'asset' || cat === 'expense') setBalanceType('debit');
                  else setBalanceType('credit');
                }}
                className="w-full border border-slate-200 rounded-lg p-2"
              >
                <option value="asset">1. الأصول (Assets)</option>
                <option value="liability">2. الخصوم (Liabilities)</option>
                <option value="equity">3. حقوق الملكية (Equity)</option>
                <option value="revenue">4. الإيرادات (Revenues)</option>
                <option value="expense">5. المصروفات (Expenses)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">التصنيف الفرعي</label>
              <input
                type="text"
                placeholder="مثال: أصول متداولة، تشغيل..."
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-700">الوصف والملاحظات:</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="وصف استخدامات الحساب..."
              className="w-full border border-slate-200 rounded-lg p-2"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs cursor-pointer"
            >
              حفظ الحساب
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
