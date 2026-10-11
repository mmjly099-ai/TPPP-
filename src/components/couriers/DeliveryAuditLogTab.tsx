import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Clock,
  Search,
  Filter,
  RotateCcw,
  AlertCircle,
  FileText,
  User,
  Key
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AuditLog } from '../../types';

interface DeliveryAuditLogTabProps {
  currentRole: 'admin' | 'accountant' | 'courier';
  onRoleChange: (role: 'admin' | 'accountant' | 'courier') => void;
}

export const DeliveryAuditLogTab: React.FC<DeliveryAuditLogTabProps> = ({
  currentRole,
  onRoleChange
}) => {
  const { auditLogs = [] } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Delivery-related logs
  const deliveryLogs = useMemo(() => {
    return auditLogs.filter(
      log =>
        log.entityType === 'deliveryOrder' ||
        log.entityType === 'courier' ||
        log.entityType === 'courierSettlement' ||
        log.entityType === 'deliveryCashCollection' ||
        log.entityType === 'deliveryTrip' ||
        log.details.includes('توصيل') ||
        log.details.includes('موصل') ||
        log.details.includes('تسوية')
    );
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return deliveryLogs;
    const term = searchTerm.toLowerCase();
    return deliveryLogs.filter(
      l =>
        l.details.toLowerCase().includes(term) ||
        l.action.toLowerCase().includes(term) ||
        l.entityType.toLowerCase().includes(term) ||
        (l.performedBy && l.performedBy.toLowerCase().includes(term))
    );
  }, [deliveryLogs, searchTerm]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Role Switcher & Permissions Explainer */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#1A3668]" />
              نظام الصلاحيات وتحديد صلاحيات المستخدم
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              اختر دورك الحالي لمعاينة قيود وصلاحيات العمل في قسم التوصيل
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => onRoleChange('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                currentRole === 'admin'
                  ? 'bg-[#1A3668] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👑 المدير (كامل الصلاحيات)
            </button>
            <button
              onClick={() => onRoleChange('accountant')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                currentRole === 'accountant'
                  ? 'bg-[#1A3668] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              💼 المحاسب (مالي وتسويات)
            </button>
            <button
              onClick={() => onRoleChange('courier')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                currentRole === 'courier'
                  ? 'bg-[#1A3668] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛵 موظف التوصيل (ميداني)
            </button>
          </div>
        </div>

        {/* Permissions Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-100">
          <div className={`p-3 rounded-2xl border ${currentRole === 'admin' ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'}`}>
            <span className="font-bold text-slate-900 block mb-1">صلاحيات المدير:</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside text-[11px]">
              <li>إضافة وتعديل وإيقاف الموصلين</li>
              <li>تسجيل وحذف وتعديل طلبات التوصيل</li>
              <li>صرف التسويات وإلغاؤها بالقيد العكسي</li>
              <li>استلام النقدية وتعديل العهد</li>
              <li>الاطلاع على كافة التقارير وسجلات التدقيق</li>
            </ul>
          </div>

          <div className={`p-3 rounded-2xl border ${currentRole === 'accountant' ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'}`}>
            <span className="font-bold text-slate-900 block mb-1">صلاحيات المحاسب:</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside text-[11px]">
              <li>تسجيل التحصيلات النقدية وتحويلات المحافظ</li>
              <li>تنفيذ تسويات مستحقات الموصلين</li>
              <li>متابعة حركة المحافظ والأرصدة المستقلة</li>
              <li>تصدير التقارير المالية لـ Excel وطباعتها</li>
              <li>منع الحذف المباشر (إلغاء بقيد عكسي فقط)</li>
            </ul>
          </div>

          <div className={`p-3 rounded-2xl border ${currentRole === 'courier' ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50 border-slate-200'}`}>
            <span className="font-bold text-slate-900 block mb-1">صلاحيات موظف التوصيل:</span>
            <ul className="text-slate-600 space-y-1 list-disc list-inside text-[11px]">
              <li>عرض الطلبات المسندة إليه فقط</li>
              <li>تحديث حالة التوصيل (تم التسليم، تعذر...)</li>
              <li>الاطلاع على رصيد عهدته النقدية الحالية</li>
              <li>منع التعديل على المبالغ المحاسبية أو المحافظ</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden space-y-3">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1A3668]" />
              سجل التدقيق والعمليات غير القابلة للتلاعب ({filteredLogs.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              توثيق هوية المنفذ، تاريخ ووقت العملية، نوع التعديل، والحركات المالية المترتبة
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في سجل العمليات..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1A3668]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#1A3668] text-white">
              <tr>
                <th className="py-2.5 px-3.5 font-bold">التاريخ والوقت</th>
                <th className="py-2.5 px-3.5 font-bold">المستخدم المنفذ</th>
                <th className="py-2.5 px-3.5 font-bold">نوع الإجراء</th>
                <th className="py-2.5 px-3.5 font-bold">الكيان</th>
                <th className="py-2.5 px-3.5 font-bold">تفاصيل العملية والبيان المالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => {
                const actionBadgeColor =
                  log.action === 'CREATE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : log.action === 'UPDATE'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : log.action === 'CANCEL'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-YE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.performedBy || 'إدارة توب ستور'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 font-bold whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-lg border text-[11px] ${actionBadgeColor}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-mono whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-3.5 text-slate-900 font-medium">
                      {log.details}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    لا توجد عمليات مسجلة في سجل التدقيق حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
