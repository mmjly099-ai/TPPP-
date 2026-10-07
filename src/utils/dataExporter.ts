import * as XLSX from 'xlsx';
import { TopStoreBackup } from '../types';

/**
 * Export data to Excel XLSX with multiple sheets
 */
export function exportToXlsx(data: TopStoreBackup, customFilename?: string): { filename: string; sizeKb: number } {
  const wb = XLSX.utils.book_new();

  const tables = data.tables;

  // Sheet 1: Customers
  if (tables.customers && tables.customers.length > 0) {
    const rows = tables.customers.map(c => ({
      'رقم العميل': c.code,
      'اسم العميل': c.name,
      'رقم الهاتف': c.phone,
      'هاتف إضافي': c.alternatePhone || '',
      'المحافظة': c.governorate,
      'العنوان / موقع الاستلام': c.pickupLocation || '',
      'الرصيد الافتتاحي': c.openingBalance,
      'الحالة': c.status === 'active' ? 'نشط' : 'غير نشط',
      'تاريخ التسجيل': c.createdAt,
      'الملاحظات': c.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  }

  // Sheet 2: Orders
  if (tables.orders && tables.orders.length > 0) {
    const rows = tables.orders.map(o => ({
      'رقم الطلب': o.orderNumber,
      'اسم العميل': o.customerName || '',
      'كود العميل': o.customerCode || '',
      'الموقع / المتجر': o.site,
      'رقم التتبع': o.shipmentNumber || '',
      'عدد المنتجات': o.itemsCount,
      'المبلغ الإجمالي': o.totalAmount,
      'الخصم': o.discount,
      'المبلغ المدفوع': o.paidAmount,
      'المتبقي': o.remainingAmount,
      'رسوم التوصيل': o.deliveryFee,
      'حالة الطلب': o.status,
      'تاريخ الطلب': o.orderDate,
      'الملاحظات': o.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
  }

  // Sheet 3: Payments
  if (tables.payments && tables.payments.length > 0) {
    const rows = tables.payments.map(p => ({
      'رقم السند': p.paymentNumber,
      'رقم العميل': p.customerId,
      'المبلغ': p.amount,
      'طريقة الدفع': p.paymentMethod,
      'تاريخ السند': p.paymentDate,
      'الملاحظات': p.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'المدفوعات');
  }

  // Sheet 4: Expenses
  if (tables.expenses && tables.expenses.length > 0) {
    const rows = tables.expenses.map(e => ({
      'رقم السند': e.expenseNumber,
      'البند / النوع': e.category,
      'المبلغ': e.amount,
      'طريقة الدفع': e.paymentMethod,
      'البيان': e.description,
      'المورد / المستفيد': e.vendorName || '',
      'تاريخ الصرف': e.createdAt,
      'الملاحظات': e.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
  }

  // Sheet 5: Accounts & Wallets
  if (tables.accounts && tables.accounts.length > 0) {
    const rows = tables.accounts.map(a => ({
      'اسم المحفظة / البنك': a.name,
      'نوع الحساب': a.type,
      'الرصيد الافتتاحي': a.openingBalance,
      'الحالة': a.status === 'active' ? 'نشط' : 'معطل',
      'الملاحظات': a.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'المحافظ والبنوك');
  }

  // Sheet 6: Purchase Batches
  if (tables.purchaseBatches && tables.purchaseBatches.length > 0) {
    const rows = tables.purchaseBatches.map(b => ({
      'رقم الدفعة': b.batchNumber,
      'الموقع': b.source,
      'حساب الدفع': b.accountName || '',
      'التكلفة الإجمالية (ريال)': b.totalCost,
      'تاريخ الشراء': b.purchaseDate,
      'الملاحظات': b.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'دفعات المشتريات');
  }

  // Sheet 7: Receivables
  if (tables.otherReceivables && tables.otherReceivables.length > 0) {
    const rows = tables.otherReceivables.map(r => ({
      'الطرف / الاسم': r.name,
      'التصنيف': r.entityType,
      'البيان': r.reason,
      'المبلغ': r.openingBalance,
      'الحالة': r.status === 'settled' ? 'مسدد' : 'غير مسدد',
      'الملاحظات': r.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'الذمم المدينة والأصول');
  }

  // Sheet 8: Installment Plans (نظام الدفعات والأقساط)
  if (tables.installmentPlans && tables.installmentPlans.length > 0) {
    const rows = tables.installmentPlans.map(p => ({
      'رقم الخطة': p.planNumber,
      'عنوان الخطة': p.title,
      'اسم العميل': p.customerName,
      'رقم الطلب': p.orderNumber || '',
      'إجمالي الخطة': p.totalAmount,
      'المبلغ المسدد': p.paidAmount,
      'المبلغ المتبقي': p.remainingAmount,
      'عدد الدفعات': p.installments?.length || 0,
      'الحالة': p.status === 'completed' ? 'مكتملة' : p.status === 'overdue' ? 'متأخرة' : 'نشطة',
      'تاريخ الإنشاء': p.createdAt
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'نظام الدفعات والأقساط');
  }

  // Sheet 9: Couriers (الموصلين ومناديب التوصيل)
  if (tables.couriers && tables.couriers.length > 0) {
    const rows = tables.couriers.map(c => ({
      'كود الموصل': c.code,
      'الاسم': c.name,
      'رقم الهاتف': c.phone,
      'وسيلة النقل': c.vehicleType || '',
      'نطاق التغطية': c.coverageZones,
      'أجرة التوصيل الافتراضية': c.defaultDeliveryFee || 0,
      'الحالة': c.status === 'available' ? 'متاح' : c.status === 'on_delivery' ? 'في رحلة توصيل' : 'غير نشط',
      'العهدة النقدية الحالية': c.currentCustodyBalance || 0,
      'عدد الطلبات المسلمة': c.deliveredOrdersCount || 0,
      'ملاحظات': c.notes || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'الموصلين والمناديب');
  }

  // Sheet 10: Delivery Trips (رحلات التوصيل)
  if (tables.deliveryTrips && tables.deliveryTrips.length > 0) {
    const rows = tables.deliveryTrips.map(t => ({
      'رقم الرحلة': t.tripNumber,
      'الموصل': t.courierName,
      'التاريخ': t.date,
      'الحالة': t.status === 'settled' ? 'تمت التصفية والتوريد' : t.status === 'cancelled' ? 'ملغاة' : 'جارية',
      'إجمالي الطلبات': t.totalOrdersCount,
      'تم التسليم': t.deliveredCount,
      'المرتجع': t.returnedCount,
      'المبلغ المتوقع': t.totalExpectedCash,
      'المبلغ المحصل': t.totalCollectedCash,
      'أجور الموصل': t.courierCommissionTotal,
      'الصافي المورد للمتجر': t.netDepositedToStore,
      'الحساب المودع فيه': t.depositAccountName || '',
      'تاريخ التصفية': t.settledAt || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'رحلات التوصيل');
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = customFilename || `top_store_full_export_${dateStr}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);

  return {
    filename,
    sizeKb: 50
  };
}

/**
 * Export permanent ZIP package containing JSON backup, Excel sheets, and README
 */
export async function exportToZip(
  data: TopStoreBackup,
  customFilename?: string
): Promise<{ filename: string; sizeKb: number }> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // 1. JSON file
  const jsonString = JSON.stringify(data, null, 2);
  zip.file('top-store-accounting-permanent.json', jsonString);

  // 2. Excel workbook
  const wb = XLSX.utils.book_new();
  const tables = data.tables;

  if (tables.customers?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.customers);
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  }
  if (tables.orders?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.orders);
    XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
  }
  if (tables.payments?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.payments);
    XLSX.utils.book_append_sheet(wb, ws, 'المدفوعات');
  }
  if (tables.expenses?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.expenses);
    XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
  }
  if (tables.accounts?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.accounts);
    XLSX.utils.book_append_sheet(wb, ws, 'المحافظ');
  }
  if (tables.purchaseBatches?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.purchaseBatches);
    XLSX.utils.book_append_sheet(wb, ws, 'دفعات_المشتريات');
  }
  if (tables.otherReceivables?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.otherReceivables);
    XLSX.utils.book_append_sheet(wb, ws, 'السلف_والذمم');
  }
  if (tables.installmentPlans?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.installmentPlans);
    XLSX.utils.book_append_sheet(wb, ws, 'نظام_الدفعات');
  }
  if (tables.couriers?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.couriers);
    XLSX.utils.book_append_sheet(wb, ws, 'الموصلين_والمناديب');
  }
  if (tables.deliveryTrips?.length) {
    const ws = XLSX.utils.json_to_sheet(tables.deliveryTrips);
    XLSX.utils.book_append_sheet(wb, ws, 'رحلات_التوصيل');
  }

  const excelArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  zip.file('top_store_database.xlsx', excelArray);

  // 3. Info text
  const readmeText = `TOP STORE ACCOUNTING - PERMANENT ARCHIVE BACKUP
==================================================
تاريخ التصدير: ${new Date().toLocaleString('ar-YE')}
هذا الملف المضغوط (ZIP) يمثل الأرشيف المحاسبي الدائم الكامل لنظام TOP STORE.
يحتوي الملف على:
1. top-store-accounting-permanent.json: قاعدة البيانات المحاسبية المتكاملة مع كافة السجلات.
2. top_store_database.xlsx: جداول البيانات مهيأة للعرض والتعديل في مايكروسوفت إكسل.

طريقة الاستعادة:
يمكنك استعادة هذا الملف في أي وقت عبر الدخول إلى قسم (استيراد البيانات) واختيار ملف ZIP مباشرة،
أو سحب وإفلات ملف top-store-accounting-permanent.zip في النظام ليتم استعادة كافة العمليات والبيانات فوراً.
`;
  zip.file('README.txt', readmeText);

  // Generate zip blob
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = customFilename || 'top-store-accounting-permanent.zip';

  // Trigger download
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    sizeKb: Math.round(zipBlob.size / 1024)
  };
}

/**
 * Export specific table to CSV with UTF-8 BOM for perfect Arabic display in Excel
 */
export function exportToCsv(
  rows: Record<string, any>[],
  tableNameArabic: string,
  customFilename?: string
): { filename: string; sizeKb: number } {
  if (!rows || rows.length === 0) {
    throw new Error('لا توجد بيانات متاحة للتصدير في هذا القسم.');
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  // Prepend UTF-8 BOM so Excel opens Arabic correctly without garbling
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = customFilename || `top_store_${tableNameArabic}_${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    sizeKb: Math.round(blob.size / 1024)
  };
}
