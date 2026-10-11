import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  BarChart2,
  TrendingUp,
  DollarSign,
  Wallet,
  Bike,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Layers,
  Search
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../../context/StoreContext';
import { DeliveryOrder, Courier, CourierSettlement } from '../../types';

export const DeliveryReportsTab: React.FC = () => {
  const {
    deliveryOrders = [],
    couriers = [],
    courierSettlements = [],
    deliveryCashCollections = [],
    accounts = [],
    getAccountBalance
  } = useStore();

  // Active Report subtab: 1 | 2 | 3 | 4 | 5
  const [selectedReport, setSelectedReport] = useState<'performance' | 'collection' | 'settlements' | 'wallets' | 'fees'>('performance');

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected couriers for comparison (in performance report)
  const [comparedCourierIds, setComparedCourierIds] = useState<number[]>([]);

  // Filter helper
  const isInDateRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.split('T')[0];
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  const periodOrders = useMemo(() => {
    return deliveryOrders.filter(o => isInDateRange(o.dispatchDate || o.createdAt));
  }, [deliveryOrders, startDate, endDate]);

  const periodSettlements = useMemo(() => {
    return courierSettlements.filter(s => isInDateRange(s.paymentDate || s.createdAt));
  }, [courierSettlements, startDate, endDate]);

  const periodCashHandover = useMemo(() => {
    return deliveryCashCollections.filter(c => isInDateRange(c.receivedDate || c.createdAt));
  }, [deliveryCashCollections, startDate, endDate]);

  // ----------------------------------------------------
  // REPORT 1: Performance Report
  // ----------------------------------------------------
  const performanceData = useMemo(() => {
    return couriers.map(courier => {
      const assigned = periodOrders.filter(o => o.courierId === courier.id);
      const totalCount = assigned.length;
      const deliveredCount = assigned.filter(o => o.status === 'delivered').length;
      const failedCount = assigned.filter(o => o.status === 'delivery_failed').length;
      const returnedCount = assigned.filter(o => o.status === 'returned').length;
      const inProgressCount = assigned.filter(
        o => o.status === 'pending_dispatch' || o.status === 'received_by_courier' || o.status === 'out_for_delivery'
      ).length;

      const successRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;
      const totalFees = assigned.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

      return {
        courier,
        totalCount,
        deliveredCount,
        failedCount,
        returnedCount,
        inProgressCount,
        successRate,
        totalFees,
        custodyBalance: Number(courier.currentCustodyBalance) || 0,
        payableBalance: Number(courier.currentPayableBalance) || 0
      };
    }).sort((a, b) => b.deliveredCount - a.deliveredCount);
  }, [couriers, periodOrders]);

  // ----------------------------------------------------
  // REPORT 2: Collection Report
  // ----------------------------------------------------
  const collectionData = useMemo(() => {
    const cashCollectedFees = periodOrders
      .filter(o => o.collectionStatus === 'collected_cash' || (o.collectionMethod === 'cash_to_courier' && o.status === 'delivered'))
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    const walletTransferredFees = periodOrders
      .filter(o => o.collectionStatus === 'transferred_to_wallet' || o.collectionMethod === 'transfer_to_wallet')
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    const cashHandedOver = periodCashHandover
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const unsettledCustody = couriers.reduce((sum, c) => sum + (Number(c.currentCustodyBalance) || 0), 0);

    return {
      cashCollectedFees,
      walletTransferredFees,
      cashHandedOver,
      unsettledCustody,
      orders: periodOrders
    };
  }, [periodOrders, periodCashHandover, couriers]);

  // ----------------------------------------------------
  // REPORT 3: Settlements Report
  // ----------------------------------------------------
  const settlementsData = useMemo(() => {
    const totalPaid = periodSettlements
      .filter(s => s.status === 'confirmed')
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const perCourierBreakdown = couriers.map(c => {
      const settled = periodSettlements
        .filter(s => s.courierId === c.id && s.status === 'confirmed')
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

      return {
        courier: c,
        settled,
        payableBalance: Number(c.currentPayableBalance) || 0
      };
    });

    return {
      totalPaid,
      settlements: periodSettlements,
      perCourierBreakdown
    };
  }, [periodSettlements, couriers]);

  // ----------------------------------------------------
  // REPORT 4: Wallets Movement Report
  // ----------------------------------------------------
  const walletsMovementData = useMemo(() => {
    return accounts
      .filter(
        a =>
          a.type === 'محفظة' ||
          a.name.includes('كريمي') ||
          a.name.includes('جيب') ||
          a.name.includes('ون كاش') ||
          a.name.includes('محفظ')
      )
      .map(wallet => {
        const orderInflows = periodOrders
          .filter(o => o.walletId === wallet.id && (o.collectionStatus === 'transferred_to_wallet' || o.collectionMethod === 'transfer_to_wallet'))
          .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

        const cashRemitInflows = periodCashHandover
          .filter(c => c.status === 'confirmed' && c.receivedIntoAccountId === wallet.id)
          .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

        const totalInflows = orderInflows + cashRemitInflows;

        const totalOutflows = periodSettlements
          .filter(s => s.status === 'confirmed' && s.walletId === wallet.id)
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const currentBalance = getAccountBalance(wallet.id);
        const opening = Number(wallet.balance) || 0;

        return {
          wallet,
          opening,
          totalInflows,
          totalOutflows,
          netPeriod: totalInflows - totalOutflows,
          currentBalance
        };
      });
  }, [accounts, periodOrders, periodCashHandover, periodSettlements, getAccountBalance]);

  // ----------------------------------------------------
  // REPORT 5: Delivery Fees Report (By Day, Month, Courier)
  // ----------------------------------------------------
  const feesData = useMemo(() => {
    const totalFees = periodOrders.reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const collectedFees = periodOrders
      .filter(o => o.collectionStatus === 'collected_cash' || o.collectionStatus === 'transferred_to_wallet')
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const uncollectedFees = totalFees - collectedFees;

    const cashFees = periodOrders
      .filter(o => o.collectionMethod === 'cash_to_courier')
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);
    const walletFees = periodOrders
      .filter(o => o.collectionMethod === 'transfer_to_wallet')
      .reduce((sum, o) => sum + (Number(o.deliveryFee) || 0), 0);

    // Group by Date
    const dailyMap: Record<string, { total: number; cash: number; wallet: number; count: number }> = {};
    periodOrders.forEach(o => {
      const d = o.dispatchDate?.split('T')[0] || o.createdAt?.split('T')[0] || 'غير محدد';
      if (!dailyMap[d]) dailyMap[d] = { total: 0, cash: 0, wallet: 0, count: 0 };
      const fee = Number(o.deliveryFee) || 0;
      dailyMap[d].total += fee;
      dailyMap[d].count += 1;
      if (o.collectionMethod === 'cash_to_courier') dailyMap[d].cash += fee;
      if (o.collectionMethod === 'transfer_to_wallet') dailyMap[d].wallet += fee;
    });

    const dailyList = Object.entries(dailyMap).map(([date, val]) => ({
      date,
      ...val
    })).sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalFees,
      collectedFees,
      uncollectedFees,
      cashFees,
      walletFees,
      dailyList
    };
  }, [periodOrders]);

  // Export to Excel handler
  const handleExportExcel = () => {
    let sheetData: any[] = [];
    let fileName = `TopStore_Delivery_Report_${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (selectedReport === 'performance') {
      sheetData = performanceData.map((item, idx) => ({
        'الترتيب': idx + 1,
        'اسم الموصل': item.courier.name,
        'الكود': item.courier.code,
        'رقم الهاتف': item.courier.phone,
        'منطقة التغطية': item.courier.zone || item.courier.coverageZones,
        'إجمالي الطلبات المسندة': item.totalCount,
        'المسلّمة بنجاح': item.deliveredCount,
        'نسبة النجاح %': `${item.successRate}%`,
        'قيد التوصيل': item.inProgressCount,
        'المتعثرة': item.failedCount,
        'المرتجعة': item.returnedCount,
        'إجمالي أجور التوصيل': item.totalFees,
        'العهدة النقدية الحالية': item.custodyBalance,
        'المستحقات غير المسواة': item.payableBalance
      }));
    } else if (selectedReport === 'collection') {
      sheetData = collectionData.orders.map(o => ({
        'رقم عملية التوصيل': o.deliveryNumber,
        'رقم طلب توب ستور': o.orderNumber,
        'رقم الشحنة': o.shipmentNumber || '',
        'اسم العميلة': o.customerName,
        'هاتف العميلة': o.customerPhone,
        'المحافظة': o.governorate,
        'الموصل المسؤول': o.courierName,
        'أجرة التوصيل': o.deliveryFee,
        'طريقة التحصيل': o.collectionMethod === 'cash_to_courier' ? 'نقداً للموصل' : o.collectionMethod === 'transfer_to_wallet' ? 'محفظة' : 'معفاة',
        'حالة التحصيل': o.collectionStatus,
        'المحفظة المسلم إليها': o.walletName || '',
        'رقم المرجع': o.walletReference || '',
        'التاريخ': o.dispatchDate?.split('T')[0] || ''
      }));
    } else if (selectedReport === 'settlements') {
      sheetData = settlementsData.settlements.map(s => ({
        'رقم التسوية': s.settlementNumber,
        'اسم الموصل': s.courierName,
        'المبلغ المدفوع': s.amount,
        'المحفظة المسدد منها': s.walletName,
        'تاريخ الدفع': s.paymentDate,
        'رقم المرجع': s.referenceNumber || '',
        'الحالة': s.status,
        'ملاحظات': s.notes || ''
      }));
    } else if (selectedReport === 'wallets') {
      sheetData = walletsMovementData.map(w => ({
        'اسم المحفظة': w.wallet.name,
        'الرصيد الافتتاحي': w.opening,
        'إجمالي الداخل للتوصيل': w.totalInflows,
        'إجمالي الخارج للموصلين': w.totalOutflows,
        'صافي حركة الفترة': w.netPeriod,
        'الرصيد الحالي': w.currentBalance
      }));
    } else if (selectedReport === 'fees') {
      sheetData = feesData.dailyList.map(d => ({
        'التاريخ': d.date,
        'عدد الطلبات': d.count,
        'إجمالي الأجور': d.total,
        'نقدية (عهدة للموصل)': d.cash,
        'محولة للمحفظة': d.wallet
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير التوصيل');
    XLSX.writeFile(workbook, fileName);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1A3668]" />
            مركز التقارير المحاسبية والتشغيلية لإدارة التوصيل
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تقارير أداء الموصلين، تحصيلات العهد، التسويات، حركة المحافظ، والأجور
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-[#1A3668] hover:bg-[#234885] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Report Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 print:hidden">
        
        {/* 5 Reports Switcher Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <button
            onClick={() => setSelectedReport('performance')}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer font-bold text-xs ${
              selectedReport === 'performance'
                ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Bike className="w-4 h-4 mx-auto mb-1 text-[#C5A059]" />
            1. أداء الموصّلين
          </button>

          <button
            onClick={() => setSelectedReport('collection')}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer font-bold text-xs ${
              selectedReport === 'collection'
                ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            2. تقرير التحصيل
          </button>

          <button
            onClick={() => setSelectedReport('settlements')}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer font-bold text-xs ${
              selectedReport === 'settlements'
                ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            3. تقرير التسويات
          </button>

          <button
            onClick={() => setSelectedReport('wallets')}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer font-bold text-xs ${
              selectedReport === 'wallets'
                ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            4. حركة المحافظ
          </button>

          <button
            onClick={() => setSelectedReport('fees')}
            className={`p-3 rounded-2xl border text-center transition cursor-pointer font-bold text-xs ${
              selectedReport === 'fees'
                ? 'bg-[#1A3668] text-white border-[#1A3668] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-4 h-4 mx-auto mb-1 text-purple-500" />
            5. أجور التوصيل
          </button>
        </div>

        {/* Date Filter Inputs */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#1A3668]" />
            فترة التقرير:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
            >
              إعادة ضبط لكافة الفترات
            </button>
          )}
        </div>

      </div>

      {/* Printable Report Header */}
      <div className="hidden print:flex items-center justify-between border-b-2 border-[#1A3668] pb-3 text-slate-900 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/top_store_logo.jpg"
              alt="شعار توب ستور TOP STORE"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A3668]">TOP STORE | تقرير التوصيل والتوزيع</h1>
            <p className="text-xs text-slate-600">
              نوع التقرير: {
                selectedReport === 'performance' ? 'تقرير أداء الموصلين' :
                selectedReport === 'collection' ? 'تقرير التحصيل والعهد النقدية' :
                selectedReport === 'settlements' ? 'تقرير تسويات مستحقات الموصلين' :
                selectedReport === 'wallets' ? 'تقرير حركة المحافظ المتعلقة بالتوصيل' : 'تقرير أجور التوصيل'
              }
              {startDate ? ` • من: ${startDate}` : ''} {endDate ? ` • إلى: ${endDate}` : ''}
            </p>
          </div>
        </div>
        <div className="text-left text-xs font-mono text-slate-500">
          <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-YE')}</div>
          <div>إدارة العمليات والتسويات</div>
        </div>
      </div>

      {/* REPORT CONTENT VIEWS */}
      
      {/* 1. Performance Report View */}
      {selectedReport === 'performance' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-black text-xs text-slate-900">
              تقرير أداء الموصّلين وترتيبهم حسب الإنجاز ونسب النجاح
            </h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              أفضل موصل: {performanceData[0]?.courier.name || '—'} ({performanceData[0]?.deliveredCount || 0} طلب)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white">
                <tr>
                  <th className="py-2.5 px-3 font-bold">الترتيب</th>
                  <th className="py-2.5 px-3 font-bold">اسم الموصل</th>
                  <th className="py-2.5 px-3 font-bold">المنطقة</th>
                  <th className="py-2.5 px-3 font-bold text-center">المسند</th>
                  <th className="py-2.5 px-3 font-bold text-center">المسلّم بنجاح</th>
                  <th className="py-2.5 px-3 font-bold text-center">نسبة النجاح</th>
                  <th className="py-2.5 px-3 font-bold text-center">قيد التوصيل</th>
                  <th className="py-2.5 px-3 font-bold text-center">تعذر/مرتجع</th>
                  <th className="py-2.5 px-3 font-bold text-left">أجور التوصيل</th>
                  <th className="py-2.5 px-3 font-bold text-left">العهدة الحالية</th>
                  <th className="py-2.5 px-3 font-bold text-left">مستحقات معلقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performanceData.map((item, idx) => (
                  <tr key={item.courier.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-black text-slate-800">
                      {idx === 0 ? '🥇 الأول' : idx === 1 ? '🥈 الثاني' : idx === 2 ? '🥉 الثالث' : `#${idx + 1}`}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{item.courier.name}</td>
                    <td className="py-3 px-3 text-slate-600">{item.courier.zone || item.courier.coverageZones}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700">{item.totalCount}</td>
                    <td className="py-3 px-3 text-center font-black text-emerald-700">{item.deliveredCount}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-lg ${item.successRate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.successRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-amber-700 font-bold">{item.inProgressCount}</td>
                    <td className="py-3 px-3 text-center text-rose-700 font-bold">{item.failedCount + item.returnedCount}</td>
                    <td className="py-3 px-3 text-left font-black text-[#1A3668]">{item.totalFees.toLocaleString()} ريال</td>
                    <td className="py-3 px-3 text-left font-bold text-amber-700">
                      {item.custodyBalance > 0 ? `${item.custodyBalance.toLocaleString()} ريال` : '0 ريال'}
                    </td>
                    <td className="py-3 px-3 text-left font-bold text-purple-700">
                      {item.payableBalance > 0 ? `${item.payableBalance.toLocaleString()} ريال` : '0 ريال'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Collection Report View */}
      {selectedReport === 'collection' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">نقدية محصلة مع الموصلين</span>
              <span className="text-lg font-black text-amber-800 mt-1 block">
                {collectionData.cashCollectedFees.toLocaleString()} ريال
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">محولة لمحافظ توب ستور</span>
              <span className="text-lg font-black text-[#1A3668] mt-1 block">
                {collectionData.walletTransferredFees.toLocaleString()} ريال
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">نقد مورد للإدارة بسندات</span>
              <span className="text-lg font-black text-emerald-800 mt-1 block">
                {collectionData.cashHandedOver.toLocaleString()} ريال
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-amber-200 bg-amber-50/40">
              <span className="text-xs font-bold text-amber-900 block">عهدة نقدية باقية بالذمة</span>
              <span className="text-lg font-black text-amber-900 mt-1 block">
                {collectionData.unsettledCustody.toLocaleString()} ريال
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-900">
              تفاصيل مبالغ التوصيل المحصلة لكل طلب
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A3668] text-white">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">رقم التوصيل</th>
                    <th className="py-2.5 px-3 font-bold">طلب توب ستور</th>
                    <th className="py-2.5 px-3 font-bold">العميلة</th>
                    <th className="py-2.5 px-3 font-bold">الموصل</th>
                    <th className="py-2.5 px-3 font-bold">المبلغ</th>
                    <th className="py-2.5 px-3 font-bold">طريقة التحصيل</th>
                    <th className="py-2.5 px-3 font-bold">حالة التحصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collectionData.orders.map(o => (
                    <tr key={o.id}>
                      <td className="py-2.5 px-3 font-mono font-bold">{o.deliveryNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">#{o.orderNumber}</td>
                      <td className="py-2.5 px-3 font-bold">{o.customerName}</td>
                      <td className="py-2.5 px-3">{o.courierName}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900">{o.deliveryFee.toLocaleString()} ريال</td>
                      <td className="py-2.5 px-3 font-semibold">
                        {o.collectionMethod === 'cash_to_courier' ? 'نقداً للموصل (عهدة)' : o.collectionMethod === 'transfer_to_wallet' ? `محفظة (${o.walletName || ''})` : 'معفاة'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold">
                          {o.collectionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Settlements Report View */}
      {selectedReport === 'settlements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500 block">إجمالي ما تم تسويته وصرفه للموصلين خلال الفترة</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              {settlementsData.totalPaid.toLocaleString()} ريال
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-900">
              كشف التسويات المصروفة من محافظ TOP STORE
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A3668] text-white">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">رقم التسوية</th>
                    <th className="py-2.5 px-3 font-bold">الموصل</th>
                    <th className="py-2.5 px-3 font-bold">المبلغ المسوى</th>
                    <th className="py-2.5 px-3 font-bold">المحفظة المسدد منها</th>
                    <th className="py-2.5 px-3 font-bold">تاريخ الدفع</th>
                    <th className="py-2.5 px-3 font-bold">المرجع</th>
                    <th className="py-2.5 px-3 font-bold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlementsData.settlements.map(s => (
                    <tr key={s.id}>
                      <td className="py-2.5 px-3 font-mono font-bold">{s.settlementNumber}</td>
                      <td className="py-2.5 px-3 font-bold">{s.courierName}</td>
                      <td className="py-2.5 px-3 font-black text-emerald-700">{s.amount.toLocaleString()} ريال</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">{s.walletName}</td>
                      <td className="py-2.5 px-3 font-mono">{s.paymentDate}</td>
                      <td className="py-2.5 px-3 font-mono">{s.referenceNumber || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">مؤكدة ومصروفة</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Wallets Movement Report View */}
      {selectedReport === 'wallets' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-900">
            كشف حركة المحافظ المرتبطة بعمليات التوصيل
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white">
                <tr>
                  <th className="py-2.5 px-3 font-bold">اسم المحفظة</th>
                  <th className="py-2.5 px-3 font-bold">الرصيد الافتتاحي</th>
                  <th className="py-2.5 px-3 font-bold text-blue-300">الداخل للتوصيل (+)</th>
                  <th className="py-2.5 px-3 font-bold text-emerald-300">المصروف للموصلين (-)</th>
                  <th className="py-2.5 px-3 font-bold">صافي حركة الفترة</th>
                  <th className="py-2.5 px-3 font-bold text-left">الرصيد الحالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {walletsMovementData.map(w => (
                  <tr key={w.wallet.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 font-black text-slate-900">{w.wallet.name}</td>
                    <td className="py-3 px-3 font-mono">{w.opening.toLocaleString()} ريال</td>
                    <td className="py-3 px-3 font-bold text-blue-700">+{w.totalInflows.toLocaleString()} ريال</td>
                    <td className="py-3 px-3 font-bold text-emerald-700">-{w.totalOutflows.toLocaleString()} ريال</td>
                    <td className="py-3 px-3 font-bold font-mono">
                      {w.netPeriod >= 0 ? `+${w.netPeriod.toLocaleString()}` : w.netPeriod.toLocaleString()} ريال
                    </td>
                    <td className="py-3 px-3 text-left font-black text-base text-[#1A3668]">
                      {w.currentBalance.toLocaleString()} ريال
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Fees Report View */}
      {selectedReport === 'fees' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">إجمالي أجور التوصيل المستحقة</span>
              <span className="text-lg font-black text-[#1A3668] mt-1 block">
                {feesData.totalFees.toLocaleString()} ريال
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">الأجور المحصّلة</span>
              <span className="text-lg font-black text-emerald-700 mt-1 block">
                {feesData.collectedFees.toLocaleString()} ريال
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">أجور نقدية (بعهدة الموصل)</span>
              <span className="text-lg font-black text-amber-700 mt-1 block">
                {feesData.cashFees.toLocaleString()} ريال
              </span>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block">أجور محولة للمحافظ</span>
              <span className="text-lg font-black text-blue-700 mt-1 block">
                {feesData.walletFees.toLocaleString()} ريال
              </span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-900">
              توزيع أجور التوصيل اليومية والنقدية والمحفظة
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#1A3668] text-white">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">التاريخ</th>
                    <th className="py-2.5 px-3 font-bold text-center">عدد الطلبات</th>
                    <th className="py-2.5 px-3 font-bold">إجمالي الأجور</th>
                    <th className="py-2.5 px-3 font-bold text-amber-300">أجور نقدية للموصل</th>
                    <th className="py-2.5 px-3 font-bold text-blue-300">أجور محولة للمحفظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feesData.dailyList.map(item => (
                    <tr key={item.date} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.date}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{item.count}</td>
                      <td className="py-2.5 px-3 font-black text-slate-900">{item.total.toLocaleString()} ريال</td>
                      <td className="py-2.5 px-3 font-bold text-amber-800">{item.cash.toLocaleString()} ريال</td>
                      <td className="py-2.5 px-3 font-bold text-blue-800">{item.wallet.toLocaleString()} ريال</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
