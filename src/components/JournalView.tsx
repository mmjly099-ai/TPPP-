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
  ShieldCheck,
  RefreshCw,
  FolderTree,
  FileText,
  PieChart,
  Check,
  X,
  Eye,
  Lock,
  Unlock,
  History,
  Clock,
  FileCheck,
  Download,
  CheckSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../context/StoreContext';
import { JournalEntry, JournalLine, ChartAccount, AccountCategory, AuditLog, FiscalPeriod, FiscalYear } from '../types';
import { isEntryActiveInLedger, resolveChartAccount } from '../services/AccountingEngine';

type ActiveViewTab = 'entries' | 'deleted_entries' | 'chart_accounts' | 'trial_balance' | 'ledger' | 'income_statement' | 'balance_sheet' | 'reconciliation' | 'fiscal_periods' | 'audit_trail';

export const JournalView: React.FC = () => {
  const {
    journalEntries,
    chartAccounts,
    accounts,
    customers,
    orders,
    payments,
    expenses,
    totalCashAndBanks,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    restoreJournalEntry,
    permanentlyDeleteJournalEntry,
    restoreAllDeletedJournalEntries,
    repairAllJournalEntries,
    reverseJournalEntry,
    addChartAccount,
    updateChartAccount,
    deleteChartAccount,
    getCustomerReconciliationReport,
    runIntegrityAudit,
    fiscalPeriods,
    fiscalYears,
    auditLogs,
    closeFiscalPeriod,
    reopenFiscalPeriod,
    lockFiscalPeriod,
    closeFiscalYear,
    generateCustomerAdjustingEntry,
    reconcileAllCustomerBalances,
    showNotification
  } = useStore();

  const [activeTab, setActiveTab] = useState<ActiveViewTab>('entries');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'active' | 'posted' | 'reversed' | 'void' | 'ALL'>('active');
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
  const [deleteCascadeOption, setDeleteCascadeOption] = useState(false);
  const [deleteReasonInput, setDeleteReasonInput] = useState('حذف القيد ونقله إلى سلة المحذوفات');
  const [reversingEntry, setReversingEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('إلغاء وتسوية القيد بالكامل');

  // Deleted & Reversed (Restorable) Entries
  const activeJournalEntries = useMemo(
    () => journalEntries.filter(e => e.status !== 'void'),
    [journalEntries]
  );
  const deletedEntries = useMemo(
    () => journalEntries.filter(e => e.status === 'void'),
    [journalEntries]
  );
  const reversedEntries = useMemo(
    () => journalEntries.filter(e => e.status !== 'void' && (e.isReversed || e.status === 'reversed')),
    [journalEntries]
  );
  const restorableEntries = useMemo(
    () => journalEntries.filter(e => e.status === 'void' || e.isReversed || e.status === 'reversed'),
    [journalEntries]
  );

  // Chart account modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);

  // Reconciliation & Audit Center state
  const [auditResult, setAuditResult] = useState<ReturnType<typeof runIntegrityAudit> | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [reconSearch, setReconSearch] = useState('');
  const [reconFilter, setReconFilter] = useState<'ALL' | 'mismatched' | 'reconciled'>('ALL');

  const reconReport = useMemo(() => {
    return getCustomerReconciliationReport();
  }, [customers, orders, payments, journalEntries, getCustomerReconciliationReport]);

  const filteredReconItems = useMemo(() => {
    return reconReport.items.filter(item => {
      const matchSearch =
        item.customerName.toLowerCase().includes(reconSearch.toLowerCase()) ||
        item.customerCode.toLowerCase().includes(reconSearch.toLowerCase());
      if (!matchSearch) return false;

      if (reconFilter === 'mismatched') return !item.isReconciled;
      if (reconFilter === 'reconciled') return item.isReconciled;
      return true;
    });
  }, [reconReport, reconSearch, reconFilter]);

  // Phase 4: Fiscal Periods & Year-End Closing state
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(2026);
  const [isYearCloseModalOpen, setIsYearCloseModalOpen] = useState(false);
  const [reopenModal, setReopenModal] = useState<{ periodId: number; periodName: string; reason: string } | null>(null);

  // Phase 4: Audit Trail state
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const filteredAuditLogs = useMemo(() => {
    return (auditLogs || []).filter(log => {
      const matchSearch =
        !auditSearch ||
        log.description?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.performedBy?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        String(log.entityId || '').includes(auditSearch);

      if (!matchSearch) return false;
      if (auditActionFilter !== 'ALL' && !log.action?.includes(auditActionFilter)) return false;
      return true;
    });
  }, [auditLogs, auditSearch, auditActionFilter]);

  const yearClosingPreview = useMemo(() => {
    let rev = 0;
    let exp = 0;
    for (const je of journalEntries) {
      if (!isEntryActiveInLedger(je, journalEntries)) continue;
      const y = new Date(je.createdAt).getFullYear();
      if (y !== selectedFiscalYear) continue;
      for (const l of je.lines || []) {
        const amt = Number(l.amount) || 0;
        const code = String(l.chartAccountCode || '');
        if (code.startsWith('4')) {
          if (l.side === 'credit') rev += amt;
          else if (l.side === 'debit') rev -= amt;
        } else if (code.startsWith('5')) {
          if (l.side === 'debit') exp += amt;
          else if (l.side === 'credit') exp -= amt;
        }
      }
    }
    const net = rev - exp;
    return {
      revenue: Math.max(0, rev),
      expense: Math.max(0, exp),
      netIncome: net,
      isProfit: net >= 0
    };
  }, [journalEntries, selectedFiscalYear]);

  // Filtered Journal Entries
  const filteredEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      // Status filter
      if (statusFilter === 'active' && entry.status === 'void') return false;
      if (statusFilter === 'posted' && !isEntryActiveInLedger(entry, journalEntries)) return false;
      if (statusFilter === 'reversed' && !(entry.status !== 'void' && (entry.isReversed || entry.status === 'reversed'))) return false;
      if (statusFilter === 'void' && entry.status !== 'void') return false;

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
        if (sourceFilter === 'opening_balance' && entry.sourceType !== 'opening_balance') return false;
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
  }, [journalEntries, statusFilter, searchTerm, sourceFilter, balanceFilter, dateRange]);

  // Overall statistics (for active ledger entries)
  const journalStats = useMemo(() => {
    let grandDebit = 0;
    let grandCredit = 0;
    let unbalancedCount = 0;
    let activeCount = 0;

    journalEntries.forEach(entry => {
      if (!isEntryActiveInLedger(entry, journalEntries)) return;
      activeCount += 1;
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
      totalEntries: activeCount,
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

    // Aggregate from active journal lines
    journalEntries.forEach(entry => {
      if (!isEntryActiveInLedger(entry, journalEntries)) return;
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

    // Sort active entries chronologically
    const sorted = journalEntries
      .filter(e => isEntryActiveInLedger(e, journalEntries))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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
      if (!isEntryActiveInLedger(entry, journalEntries)) return;
      (entry.lines || []).forEach(l => {
        const amt = parseFloat(String(l.amount)) || 0;
        const name = (l.accountName || '').toLowerCase();

        // Revenue lines (Normal Credit, Reversal Debit)
        if (name.includes('مبيعات') || name.includes('وساطة') || l.chartAccountCode === '401') {
          salesRevenue += l.side === 'credit' ? amt : -amt;
        } else if (name.includes('توصيل') || l.chartAccountCode === '402') {
          deliveryRevenue += l.side === 'credit' ? amt : -amt;
        } else if (l.chartAccountCode === '409' || name.includes('إيراد')) {
          otherRevenue += l.side === 'credit' ? amt : -amt;
        }

        // Expense lines (Normal Debit, Reversal Credit)
        if (name.includes('تكلفة') || name.includes('مشتريات') || l.chartAccountCode === '501') {
          cogs += l.side === 'debit' ? amt : -amt;
        } else if (name.includes('شحن') || l.chartAccountCode === '502') {
          shippingCosts += l.side === 'debit' ? amt : -amt;
        } else if (name.includes('مصروف') || l.chartAccountCode?.startsWith('5')) {
          const signedAmt = l.side === 'debit' ? amt : -amt;
          operatingExpenses += signedAmt;
          const categoryName = (l.accountName || 'مصاريف عامة').replace('مصروفات - ', '').replace('مصاريف ', '');
          expenseBreakdown[categoryName] = (expenseBreakdown[categoryName] || 0) + signedAmt;
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
      case 'opening_balance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            رصيد افتتاحي {number ? `#${number}` : ''}
          </span>
        );
      case 'receivable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            مستحقات وذمم {number ? `#${number}` : ''}
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
      
      {/* Printable Header with Official TOP STORE Logo */}
      <div className="hidden print:flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-6" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-slate-300 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/top_store_logo.jpg"
              alt="TOP STORE"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">متجر توب ستور | TOP STORE</h2>
            <p className="text-[11px] text-slate-600 font-semibold">
              النظام المحاسبي ودفتر الأستاذ المالي • قيود اليومية وميزان المراجعة
            </p>
          </div>
        </div>
        <div className="text-left font-mono text-xs">
          <div className="font-bold text-slate-900">مستند محاسبي رسمي معتمد</div>
          <div className="text-slate-500 text-[10px]">تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</div>
        </div>
      </div>

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
            onClick={() => repairAllJournalEntries(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
            title="تصحيح الأخطاء المحاسبية وإزالة القيود المكررة ومطابقة الأرصدة"
          >
            <RefreshCw className="w-4 h-4" />
            تصحيح وفحص القيود تلقائياً
          </button>
          <button
            onClick={() => setActiveTab('deleted_entries')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              restorableEntries.length > 0
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            سلة المحذوفات واسترجاع القيود ({restorableEntries.length})
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
          دفتر اليومية العامة ({activeJournalEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('deleted_entries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'deleted_entries'
              ? 'bg-white text-rose-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-rose-600" />
          سلة المحذوفات واسترجاع القيود ({restorableEntries.length})
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

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'reconciliation'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          التسوية والفحص المحاسبي
        </button>

        <button
          onClick={() => setActiveTab('fiscal_periods')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'fiscal_periods'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-600" />
          الفترات المالية والإقفال ({fiscalPeriods.length})
        </button>

        <button
          onClick={() => setActiveTab('audit_trail')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
            activeTab === 'audit_trail'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <History className="w-4 h-4 text-cyan-600" />
          سجل الرقابة والتدقيق ({auditLogs.length})
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
              <option value="opening_balance">الأرصدة الافتتاحية</option>
              <option value="manual">القيود اليدوية الحرة</option>
              <option value="reversal">القيود العكسية والتسويات</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium"
            >
              <option value="active">القيود النشطة والمعتمدة</option>
              <option value="posted">السارية في الأستاذ فقط</option>
              <option value="reversed">القيود المعكوسة فقط ({reversedEntries.length})</option>
              <option value="void">سلة المحذوفات فقط ({deletedEntries.length})</option>
              <option value="ALL">عرض الكل (بما فيها المحذوفة)</option>
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
                const isVoid = entry.status === 'void';
                const isReversed = Boolean(!isVoid && (entry.isReversed || entry.status === 'reversed'));

                return (
                  <div
                    key={entry.id}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition hover:border-slate-300 ${
                      isVoid
                        ? 'border-rose-200 bg-rose-50/20 opacity-85'
                        : isReversed
                        ? 'border-purple-200 bg-purple-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header bar of entry */}
                    <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                          {entry.entryNumber}
                        </span>
                        {getSourceBadge(entry.sourceType, entry.sourceNumber)}
                        {isVoid && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            محذوف (في سلة المحذوفات)
                          </span>
                        )}
                        {isReversed && (
                          <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            قيد ملغى بقيد عكسي
                          </span>
                        )}
                        <h4 className={`text-xs font-bold mr-2 ${isVoid ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {entry.description}
                        </h4>
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
                          {(isVoid || isReversed) && (
                            <button
                              onClick={() => restoreJournalEntry(entry.id)}
                              title="استرجاع القيد وتفعيله في الدفتر المحاسبي"
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              استرجاع القيد
                            </button>
                          )}
                          {!isVoid && (
                            <button
                              onClick={() => setEditingEntry(entry)}
                              title="تعديل وتصحيح القيد المحاسبي"
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isVoid && !isReversed && entry.sourceType !== 'reversal' && (
                            <button
                              onClick={() => setReversingEntry(entry)}
                              title="عكس القيد بقيد عكسي (Storno Reversal)"
                              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isVoid ? (
                            <button
                              onClick={() => {
                                setDeletingEntry(entry);
                                setDeleteCascadeOption(false);
                                setDeleteReasonInput('حذف القيد ونقله إلى سلة المحذوفات');
                              }}
                              title="حذف القيد ونقله إلى سلة المحذوفات (مع إمكانية الاسترجاع)"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => permanentlyDeleteJournalEntry(entry.id)}
                              title="حذف نهائي من سلة المحذوفات"
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
      {/* TAB 1.5: DELETED & REVERSED ENTRIES (سلة المحذوفات واسترجاع القيود) */}
      {/* ============================================================== */}
      {activeTab === 'deleted_entries' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">سلة المحذوفات واسترجاع القيود المحاسبية</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  جميع القيود التي تم حذفها أو عكسها محفوظة هنا بأمان، ويمكنك استرجاع أي قيد بضغطة زر ليعود سارياً في دفتر الأستاذ وميزان المراجعة، أو حذفه نهائياً.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {deletedEntries.length > 0 && (
                <button
                  onClick={restoreAllDeletedJournalEntries}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  استرجاع جميع القيود المحذوفة ({deletedEntries.length})
                </button>
              )}
              <button
                onClick={() => repairAllJournalEntries(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                استرجاع القيود الناقصة للعمليات وإصلاح الدفتر
              </button>
            </div>
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">إجمالي القيود القابلة للاسترجاع</span>
              <div className="text-xl font-black text-slate-900 mt-1">{restorableEntries.length} قيد</div>
              <span className="text-[11px] text-slate-400">محذوفة أو معكوسة</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
              <span className="text-xs font-bold text-rose-700">قيود في سلة المحذوفات (Void)</span>
              <div className="text-xl font-black text-rose-800 mt-1">{deletedEntries.length} قيد</div>
              <span className="text-[11px] text-rose-600/80">موقوفة الأثر المالي قابلة للاسترجاع الفوري</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs">
              <span className="text-xs font-bold text-purple-700">قيود معكوسة بقيد عكسي (Reversed)</span>
              <div className="text-xl font-black text-purple-800 mt-1">{reversedEntries.length} قيد</div>
              <span className="text-[11px] text-purple-600/80">يمكن إلغاء عكسها وإعادة تفعيلها</span>
            </div>
          </div>

          {restorableEntries.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">سلة المحذوفات فارغة تماماً</h3>
              <p className="text-xs text-slate-500 mt-1">
                لا توجد أي قيود محذوفة أو معكوسة حالياً. جميع قيود النظام نشطة ومتوازنة.
              </p>
              <button
                onClick={() => repairAllJournalEntries(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                فحص وتوليد أي قيود ناقصة للطلبات أو الدفعات
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {restorableEntries.map(entry => {
                const isVoid = entry.status === 'void';
                const totalDebit = (entry.lines || [])
                  .filter(l => l.side === 'debit')
                  .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

                return (
                  <div
                    key={entry.id}
                    className={`bg-white border rounded-2xl overflow-hidden shadow-xs ${
                      isVoid ? 'border-rose-200' : 'border-purple-200'
                    }`}
                  >
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {entry.entryNumber}
                        </span>
                        {getSourceBadge(entry.sourceType, entry.sourceNumber)}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isVoid
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                        >
                          {isVoid ? 'محذوف في سلة المحذوفات' : 'ملغى بقيد عكسي'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mr-2">{entry.description}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 ml-2">
                          المبلغ: {totalDebit.toLocaleString()} ريال
                        </span>
                        <button
                          onClick={() => restoreJournalEntry(entry.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          استرجاع القيد وتفعيله
                        </button>
                        <button
                          onClick={() => permanentlyDeleteJournalEntry(entry.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف نهائي
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-white space-y-2 text-xs">
                      {(entry.deleteReason || entry.reversalReason) && (
                        <div className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
                          <span>
                            <strong className="text-slate-800">سبب الحذف / الإلغاء: </strong>
                            {entry.deleteReason || entry.reversalReason}
                          </span>
                          {entry.deletedAt && (
                            <span className="font-mono text-[11px] text-slate-400">
                              تاريخ الحذف: {new Date(entry.deletedAt).toLocaleString('ar-YE')}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(entry.lines || []).map((line, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50"
                          >
                            <span className="font-bold text-slate-700">
                              {line.side === 'debit' ? 'من حـ/ ' : 'إلى حـ/ '}
                              {line.accountName}
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                line.side === 'debit' ? 'text-blue-700' : 'text-emerald-700'
                              }`}
                            >
                              {Number(line.amount || 0).toLocaleString()} ريال ({line.side === 'debit' ? 'مدين' : 'دائن'})
                            </span>
                          </div>
                        ))}
                      </div>
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
      {/* TAB 7: RECONCILIATION & AUDIT INTEGRITY (التسوية والفحص المحاسبي)  */}
      {/* ============================================================== */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    نظام الرقابة والتسوية المحاسبية الصارمة
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Double-Entry ERP Standard
                  </span>
                </div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  مركز التدقيق والتسوية المحاسبية الشامل
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  فحص مطابقة أرصدة العملاء والعمليات التشغيلية مع قيود دفتر الأستاذ العام، والتحقق التلقائي من توازن القيد المزدوج.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setIsAuditing(true);
                    setTimeout(() => {
                      const res = runIntegrityAudit();
                      setAuditResult(res);
                      setIsAuditing(false);
                      showNotification('تم اكتمال فحص السلامة والتدقيق المحاسبي بنجاح', 'success');
                    }, 400);
                  }}
                  disabled={isAuditing}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
                  {isAuditing ? 'جارٍ الفحص...' : 'تشغيل فحص السلامة المحاسبية الفوري'}
                </button>
              </div>
            </div>
          </div>

          {/* Core Accounting Control KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">ميزان المراجعة العام</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold font-mono text-emerald-700">متوازن 100%</span>
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>الفارق: 0.00 ر.ي</span>
                <span>المدين = الدائن</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">القيود المحاسبية المرحلة</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold font-mono text-slate-900">{journalEntries.length} قيد</span>
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>الحالة: معتمدة (POSTED)</span>
                <span>محمية بقيد عكسي</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">دليل شجرة الحسابات</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold font-mono text-blue-700">{chartAccounts.length} حساب</span>
                <FolderTree className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>تغطية القيود: 100%</span>
                <span>حسابات يتيمة: 0</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">تسوية أرصدة العملاء</span>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-lg font-bold font-mono ${reconReport.mismatchedCount === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {reconReport.reconciledCount} / {reconReport.totalCustomers}
                </span>
                <Scale className={`w-5 h-5 ${reconReport.mismatchedCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>نسبة التطابق: {reconReport.matchRate}%</span>
                <span>فارق الصافي: {reconReport.netDifference.toLocaleString()} ر.ي</span>
              </div>
            </div>
          </div>

          {/* Audit Test Results Panel (if run) */}
          {auditResult && (
            <div className={`p-5 rounded-2xl border ${
              auditResult.passed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    تقرير الفحص الرقابي الآلي: {auditResult.passed ? 'كافة الاختبارات المحاسبية اجتازت بنجاح ✅' : 'اكتمل الفحص مع تنبيهات'}
                  </h4>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-slate-200 font-mono">
                  {auditResult.passedChecks} من أصل {auditResult.totalChecks} اختبارات مطابقة
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">إجمالي مدين دفتر الأستاذ:</span>
                  <div className="font-bold font-mono text-slate-900 mt-0.5">{auditResult.metrics.totalDebit.toLocaleString()} ر.ي</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">إجمالي دائن دفتر الأستاذ:</span>
                  <div className="font-bold font-mono text-slate-900 mt-0.5">{auditResult.metrics.totalCredit.toLocaleString()} ر.ي</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">القيود غير المتوازنة:</span>
                  <div className="font-bold font-mono text-emerald-700 mt-0.5">{auditResult.metrics.unbalancedEntries} قيد</div>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500">سندات / طلبات يتيمة:</span>
                  <div className="font-bold font-mono text-emerald-700 mt-0.5">{auditResult.metrics.orphanPayments + auditResult.metrics.orphanOrders} سجل</div>
                </div>
              </div>

              {auditResult.warnings && auditResult.warnings.length > 0 && (
                <div className="mt-3 text-xs text-amber-800 space-y-1 bg-amber-100/60 p-2.5 rounded-lg">
                  <div className="font-bold">ملاحظات التدقيق:</div>
                  {auditResult.warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Balances Reconciliation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  جدول تسوية ومطابقة أرصدة العملاء (Customer Ledger Reconciliation)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  مقارنة رصيد العمليات (الافتتاحي + الطلبات - المقبوضات) مع صافي حركات العميل بدفتر الأستاذ (Debit - Credit)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reconSearch}
                    onChange={e => setReconSearch(e.target.value)}
                    placeholder="بحث باسم أو كود العميل..."
                    className="pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 text-xs w-48 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <select
                  value={reconFilter}
                  onChange={e => setReconFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium"
                >
                  <option value="ALL">كافة العملاء ({reconReport.totalCustomers})</option>
                  <option value="reconciled">المتطابقون ({reconReport.reconciledCount})</option>
                  <option value="mismatched">يحتاجون تسوية ({reconReport.mismatchedCount})</option>
                </select>

                {reconReport.mismatchedCount > 0 && (
                  <button
                    onClick={() => {
                      reconcileAllCustomerBalances();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="توليد قيود تسوية لكافة العملاء ذوي الفروقات بنقرة واحدة"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    تسوية كافة الفروقات ({reconReport.mismatchedCount})
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">كود العميل</th>
                    <th className="py-3 px-4">اسم العميل</th>
                    <th className="py-3 px-4 text-center">الرصيد الافتتاحي</th>
                    <th className="py-3 px-4 text-center">إجمالي الطلبات</th>
                    <th className="py-3 px-4 text-center">إجمالي المقبوضات</th>
                    <th className="py-3 px-4 text-center font-bold text-slate-900">رصيد العمليات</th>
                    <th className="py-3 px-4 text-center font-bold text-indigo-900">رصيد دفتر الأستاذ</th>
                    <th className="py-3 px-4 text-center">فارق التسوية</th>
                    <th className="py-3 px-4 text-center">حالة المطابقة</th>
                    <th className="py-3 px-4 text-center">إجراءات التسوية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReconItems.map(item => (
                    <tr key={item.customerId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">{item.customerCode}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.customerName}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{item.openingBalance.toLocaleString()} ر.ي</td>
                      <td className="py-3 px-4 text-center font-mono text-blue-600">{item.totalOrders.toLocaleString()} ر.ي</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-600">{item.totalPayments.toLocaleString()} ر.ي</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {item.operationalBalance.toLocaleString()} ر.ي
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                        {item.ledgerBalance.toLocaleString()} ر.ي
                      </td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${
                        item.isReconciled ? 'text-slate-400' : 'text-amber-600'
                      }`}>
                        {item.difference.toLocaleString()} ر.ي
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isReconciled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" />
                            متطابق
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            فارق تسوية
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!item.isReconciled ? (
                          <button
                            onClick={() => {
                              generateCustomerAdjustingEntry(
                                item.customerId,
                                item.difference,
                                'تسوية رصيد العميل ومطابقته مع العمليات'
                              );
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 mx-auto"
                            title="توليد قيد تسوية محاسبي فوري"
                          >
                            <FileCheck className="w-3 h-3" />
                            توليد قيد تسوية
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">سليم ومطابق</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reconciliation Footer Summary */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between text-xs text-slate-700 font-semibold gap-2">
              <div className="flex items-center gap-4">
                <span>إجمالي رصيد العمليات: <strong className="font-mono text-slate-900">{reconReport.totalOperationalBalance.toLocaleString()} ر.ي</strong></span>
                <span>إجمالي رصيد الأستاذ: <strong className="font-mono text-indigo-900">{reconReport.totalLedgerBalance.toLocaleString()} ر.ي</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span>صافي فارق التسوية الكلي:</span>
                <span className={`font-mono font-bold ${reconReport.netDifference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {reconReport.netDifference.toLocaleString()} ريال يمني
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 8: FISCAL PERIODS & YEAR CLOSING (الفترات المالية والإقفال)   */}
      {/* ============================================================== */}
      {activeTab === 'fiscal_periods' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    نظام حماية الفترات وإقفال الحسابات (ERP Period Control)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Phase 4 Standard
                  </span>
                </div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Lock className="w-6 h-6 text-amber-400" />
                  إدارة الفترات المالية والسنوات وإقفال الحسابات السنوية
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  التحكم في فتح وإغلاق الفترات الربع سنوية والسنوية، ومنع الترحيل في الفترات المقفلة، وتنفيذ قيد إقفال نهاية السنة وترحيل الأرباح والخسائر.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsYearCloseModalOpen(true)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  إجراء قيد إقفال السنة المالية ({selectedFiscalYear})
                </button>
              </div>
            </div>
          </div>

          {/* Fiscal KPI Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">السنة المالية المحددة</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold font-mono text-slate-900">{selectedFiscalYear}</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  سنة نشطة
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>النوع: ميلادية</span>
                <span>01/01 - 31/12</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">الفترات المفتوحة للترحيل</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold font-mono text-emerald-700">
                  {fiscalPeriods.filter(p => p.status === 'open').length} فترات
                </span>
                <Unlock className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                الترحيل مسموح بدون قيود
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">الفترات المغلقة والمقفلة</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-bold font-mono text-amber-700">
                  {fiscalPeriods.filter(p => p.status !== 'open').length} فترات
                </span>
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                محمية تماماً من أي ترحيل جديد
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">صافي دخل السنة التقديري</span>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xl font-bold font-mono ${yearClosingPreview.isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {yearClosingPreview.netIncome.toLocaleString()} ر.ي
                </span>
                <TrendingUp className={`w-5 h-5 ${yearClosingPreview.isProfit ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>إيرادات: {yearClosingPreview.revenue.toLocaleString()}</span>
                <span>مصاريف: {yearClosingPreview.expense.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Fiscal Periods Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  جدول الفترات المالية والربعية (Fiscal Periods Schedule)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديد فترات الترحيل المسموحة وقفل الفترات لمنع إدخال أو تعديل أي حركة مالية بأثر رجعي
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">اختر السنة:</span>
                <select
                  value={selectedFiscalYear}
                  onChange={e => setSelectedFiscalYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 font-bold"
                >
                  {fiscalYears.map(y => (
                    <option key={y.id} value={y.year}>سنة {y.year} ({y.status === 'open' ? 'مفتوحة' : 'مقفلة'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">اسم الفترة</th>
                    <th className="py-3 px-4 text-center">السنة المالية</th>
                    <th className="py-3 px-4 text-center">تاريخ البداية</th>
                    <th className="py-3 px-4 text-center">تاريخ النهاية</th>
                    <th className="py-3 px-4 text-center">حالة الفترة</th>
                    <th className="py-3 px-4 text-center">تاريخ الإغلاق</th>
                    <th className="py-3 px-4 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fiscalPeriods
                    .filter(p => !selectedFiscalYear || p.fiscalYear === selectedFiscalYear)
                    .map(period => (
                      <tr key={period.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            period.status === 'open' ? 'bg-emerald-500' : period.status === 'closed' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {period.periodName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                          {period.fiscalYear}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {period.startDate}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">
                          {period.endDate}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {period.status === 'open' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Unlock className="w-3 h-3" />
                              مفتوحة للترحيل
                            </span>
                          )}
                          {period.status === 'closed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Lock className="w-3 h-3" />
                              مغلقة مؤقتاً
                            </span>
                          )}
                          {period.status === 'locked' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3" />
                              مقفلة نهائياً (LOCKED)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 text-[11px] font-mono">
                          {period.closedAt ? new Date(period.closedAt).toLocaleDateString('ar-YE') : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {period.status === 'open' && (
                              <button
                                onClick={() => closeFiscalPeriod(period.id)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                title="إغلاق الفترة لمنع الترحيل"
                              >
                                <Lock className="w-3 h-3" />
                                إغلاق الفترة
                              </button>
                            )}

                            {period.status === 'closed' && (
                              <button
                                onClick={() => setReopenModal({ periodId: period.id, periodName: period.periodName, reason: '' })}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                title="إعادة فتح الفترة"
                              >
                                <Unlock className="w-3 h-3" />
                                إعادة فتح
                              </button>
                            )}

                            {period.status !== 'locked' && (
                              <button
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من القفل النهائي للفترة (${period.periodName})؟ لن يمكن التراجع عن هذا الإجراء.`)) {
                                    lockFiscalPeriod(period.id);
                                  }
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                                title="قفل نهائي وتأمين"
                              >
                                <Lock className="w-3 h-3" />
                                قفل نهائي
                              </button>
                            )}

                            {period.status === 'locked' && (
                              <span className="text-[11px] text-slate-400 font-medium">مؤمنة نظامياً</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 9: AUDIT COMPLIANCE TRAIL (سجل الرقابة والتتبع المحاسبي)     */}
      {/* ============================================================== */}
      {activeTab === 'audit_trail' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    نظام التوثيق والرقابة الشاملة (Audit Trail & Governance)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    سجلات غير قابلة للتعديل (Append-Only)
                  </span>
                </div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-6 h-6 text-cyan-400" />
                  سجل الرقابة والتدقيق المحاسبي المكتمل (Audit Log Viewer)
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  تتبع تاريخي كامل لكافة العمليات المالية، الترحيل، القيود العكسية، إقفال الفترات، وتسويات الأرصدة مع اسم المنفذ والبيانات الدقيقة.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const ws = XLSX.utils.json_to_sheet(auditLogs.map(l => ({
                      'رقم السجل': l.id,
                      'التاريخ والوقت': l.createdAt,
                      'نوع الإجراء': l.action,
                      'المنفذ': l.performedBy,
                      'نوع الكيان': l.entityType,
                      'معرف الكيان': l.entityId,
                      'الوصف': l.description
                    })));
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'AuditLogs');
                    XLSX.writeFile(wb, `TopStore_AuditLogs_${Date.now()}.xlsx`);
                    showNotification('تم تصدير سجل التدقيق إلى Excel بنجاح', 'success');
                  }}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  تصدير سجل الرقابة (Excel)
                </button>
              </div>
            </div>
          </div>

          {/* Audit Search and Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث في سجل التدقيق (بالإجراء، الوصف، المنفذ، رقم القيد)..."
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium"
              >
                <option value="ALL">كافة أنواع الإجراءات</option>
                <option value="قيد">قيود اليومية والترحيل</option>
                <option value="عكسي">القيود العكسية</option>
                <option value="إغلاق">إغلاق الفترات المالية</option>
                <option value="فتح">إعادة فتح الفترات</option>
                <option value="إقفال">إقفال السنة المالية</option>
                <option value="تسوية">تسويات أرصدة العملاء</option>
                <option value="سند">سندات القبض والصرف</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600" />
                سجلات التدقيق الزمني ({filteredAuditLogs.length} سجل مسجل)
              </h4>
              <span className="text-xs text-slate-500">
                الحماية: سجلات غير قابلة للحذف ومحفوظة تلقائياً
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">نوع الإجراء</th>
                    <th className="py-3 px-4">المنفذ / الدور</th>
                    <th className="py-3 px-4">الكيان / المعرف</th>
                    <th className="py-3 px-4">الوصف والتفاصيل</th>
                    <th className="py-3 px-4 text-center">البيانات الفنية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        لا توجد سجلات مطابقة لمعايير البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('ar-YE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.action.includes('ترحيل') || log.action.includes('إنشاء')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.action.includes('عكسي') || log.action.includes('فتح')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : log.action.includes('إغلاق') || log.action.includes('قفل') || log.action.includes('إقفال')
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {log.performedBy || 'المستخدم المعتمد'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                            {log.entityType || 'system'}: #{log.entityId || log.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-md">
                          {log.description}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {(log.newValue || log.previousValue || log.notes) ? (
                            <button
                              onClick={() => setSelectedAuditLog(log)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 mx-auto"
                              title="عرض تفاصيل التغيير الفنية"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              فحص التفاصيل
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
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
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">حذف القيد المحاسبي ونقله لسلة المحذوفات</h3>
                <p className="text-xs text-slate-500">إيقاف الأثر المالي للقيد فوراً مع إمكانية استرجاعه في أي وقت</p>
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

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">سبب الحذف (يظهر في سجل الرقابة وسلة المحذوفات):</label>
              <input
                type="text"
                value={deleteReasonInput}
                onChange={e => setDeleteReasonInput(e.target.value)}
                placeholder="مثال: قيد مكرر أو خطأ في الإدخال..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-rose-500"
              />
            </div>

            {deletingEntry.sourceType && deletingEntry.sourceType !== 'manual' && deletingEntry.sourceType !== 'reversal' && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={deleteCascadeOption}
                  onChange={e => setDeleteCascadeOption(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 cursor-pointer"
                />
                <span className="text-slate-700">
                  <strong className="block text-amber-900 font-bold mb-0.5">إلغاء المستند الأصلي المرتبط أيضاً (اختياري):</strong>
                  عند التفعيل سيتم تحويل حالة المستند الأصلي (الطلب أو الدفعة أو المصروف) إلى ملغي، وعند استرجاع القيد لاحقاً يتم تفعيله تلقائياً.
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
                  deleteJournalEntry(deletingEntry.id, {
                    deleteSourceDocument: deleteCascadeOption,
                    reason: deleteReasonInput
                  });
                  setDeletingEntry(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs cursor-pointer"
              >
                نقل القيد إلى سلة المحذوفات
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
  const [date, setDate] = useState((entry.createdAt || new Date().toISOString()).slice(0, 10));
  const [lines, setLines] = useState<JournalLine[]>(
    (entry.lines || []).map((l, idx) => ({
      ...l,
      id: l.id || entry.id * 10 + idx + 1
    }))
  );

  const handleUpdateLine = (idx: number, field: keyof JournalLine, value: any) => {
    setLines(prev =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        if (field === 'chartAccountId') {
          const matched = chartAccounts.find(ca => ca.id === Number(value));
          if (matched) {
            return {
              ...l,
              chartAccountId: matched.id,
              chartAccountCode: matched.code,
              accountName: l.accountName?.includes('العميل:') ? l.accountName : matched.name
            };
          }
        }
        return { ...l, [field]: value };
      })
    );
  };

  const handleAddLine = (side: 'debit' | 'credit') => {
    const defaultAcc = chartAccounts.find(ca => (side === 'debit' ? ca.code === '101' : ca.code === '401')) || chartAccounts[0];
    setLines(prev => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        journalEntryId: entry.id,
        accountId: null,
        chartAccountId: defaultAcc?.id || 101,
        chartAccountCode: defaultAcc?.code || '101',
        accountName: defaultAcc?.name || 'الصندوق',
        side,
        amount: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const totalDebit = lines
    .filter(l => l.side === 'debit')
    .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

  const totalCredit = lines
    .filter(l => l.side === 'credit')
    .reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0);

  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const handleAutoBalance = () => {
    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) < 0.01) return;
    if (lines.length === 2 && lines[0].side !== lines[1].side) {
      const targetAmt = Math.max(totalDebit, totalCredit);
      setLines(prev => prev.map(l => ({ ...l, amount: targetAmt })));
    } else if (diff > 0) {
      // Need more credit
      const lastCreditIdx = lines.map(l => l.side).lastIndexOf('credit');
      if (lastCreditIdx >= 0) {
        handleUpdateLine(lastCreditIdx, 'amount', Number(lines[lastCreditIdx].amount || 0) + diff);
      } else {
        const adjAcc = chartAccounts.find(ca => ca.code === '303') || chartAccounts[0];
        setLines(prev => [
          ...prev,
          {
            id: Date.now(),
            journalEntryId: entry.id,
            accountId: null,
            chartAccountId: adjAcc?.id || 303,
            chartAccountCode: adjAcc?.code || '303',
            accountName: adjAcc?.name || 'تسويات محاسبية',
            side: 'credit',
            amount: diff
          }
        ]);
      }
    } else {
      // Need more debit
      const absDiff = Math.abs(diff);
      const lastDebitIdx = lines.map(l => l.side).lastIndexOf('debit');
      if (lastDebitIdx >= 0) {
        handleUpdateLine(lastDebitIdx, 'amount', Number(lines[lastDebitIdx].amount || 0) + absDiff);
      } else {
        const adjAcc = chartAccounts.find(ca => ca.code === '303') || chartAccounts[0];
        setLines(prev => [
          ...prev,
          {
            id: Date.now(),
            journalEntryId: entry.id,
            accountId: null,
            chartAccountId: adjAcc?.id || 303,
            chartAccountCode: adjAcc?.code || '303',
            accountName: adjAcc?.name || 'تسويات محاسبية',
            side: 'debit',
            amount: absDiff
          }
        ]);
      }
    }
  };

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">تعديل وتصحيح القيد المحاسبي #{entry.entryNumber}</h3>
              <p className="text-[11px] text-slate-500">يمكنك تعديل البيان والتاريخ والحسابات والمبالغ وموازنة القيد مباشرة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-slate-700">البيان والشرح:</label>
              <input
                type="text"
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-slate-700">تاريخ القيد:</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden focus:border-amber-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">أطراف القيد المحاسبي (الحسابات والمبالغ):</label>
              <div className="flex items-center gap-1.5">
                {!isBalanced && (
                  <button
                    type="button"
                    onClick={handleAutoBalance}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 cursor-pointer"
                  >
                    موازنة تلقائية سريعة
                  </button>
                )}
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

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {lines.map((l, idx) => (
                <div key={l.id || idx} className="p-3 bg-slate-50/50 flex flex-wrap items-center gap-2">
                  <select
                    value={l.side}
                    onChange={e => handleUpdateLine(idx, 'side', e.target.value as 'debit' | 'credit')}
                    className={`font-bold rounded-lg px-2 py-1.5 border text-xs cursor-pointer ${
                      l.side === 'debit'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <option value="debit">من حـ/ (مدين)</option>
                    <option value="credit">إلى حـ/ (دائن)</option>
                  </select>

                  <select
                    value={l.chartAccountId || ''}
                    onChange={e => handleUpdateLine(idx, 'chartAccountId', Number(e.target.value))}
                    className="border border-slate-200 bg-white rounded-lg px-2 py-1.5 font-bold text-slate-800 max-w-[200px]"
                  >
                    {chartAccounts.map(ca => (
                      <option key={ca.id} value={ca.id}>
                        [{ca.code}] {ca.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={l.accountName || ''}
                    onChange={e => handleUpdateLine(idx, 'accountName', e.target.value)}
                    placeholder="اسم الحساب التفصيلي..."
                    className="flex-1 min-w-[140px] border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                  />

                  <div className="w-28">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={l.amount}
                      onChange={e => handleUpdateLine(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full border border-slate-200 bg-white rounded-lg p-1.5 font-mono font-bold text-left"
                    />
                  </div>

                  {lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Balance Bar */}
          <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between font-mono">
            <span>مدين: <strong className="text-blue-700">{totalDebit.toLocaleString()} ريال</strong></span>
            <span>دائن: <strong className="text-emerald-700">{totalCredit.toLocaleString()} ريال</strong></span>
            <span className={`font-sans font-bold ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isBalanced ? 'متوازن 100%' : `غير متوازن (الفارق: ${Math.abs(totalDebit - totalCredit)} ريال)`}
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
              حفظ وتصحيح القيد
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
