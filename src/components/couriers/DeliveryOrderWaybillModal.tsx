import React from 'react';
import { X, Printer, Bike, Phone, MapPin, Package, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { DeliveryOrder, Courier } from '../../types';

interface DeliveryOrderWaybillModalProps {
  order: DeliveryOrder | null;
  courier?: Courier | null;
  onClose: () => void;
}

export const DeliveryOrderWaybillModal: React.FC<DeliveryOrderWaybillModalProps> = ({
  order,
  courier,
  onClose
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Controls (Hidden in Print) */}
        <div className="bg-[#1A3668] text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-[#C5A059]" />
            <span className="font-bold text-sm">سند وبوليصة تسليم طلب #{order.deliveryNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#d6b063] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة البوليصة</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-6 sm:p-8 space-y-6 a4-print-document bg-white text-slate-900">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#1A3668] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-[#C5A059] shadow-md flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/top_store_logo.jpg"
                  alt="شعار توب ستور TOP STORE"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#1A3668] tracking-tight">
                  TOP STORE | توب ستور
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  خدمات وساطة الشراء والتسوق الإلكتروني في اليمن • قسم التوزيع والتوصيل
                </p>
              </div>
            </div>
            <div className="text-left font-mono">
              <div className="text-xs text-slate-500 font-bold">بوليصة تسليم</div>
              <div className="text-base font-black text-[#1A3668]">{order.deliveryNumber}</div>
              <div className="text-[11px] text-slate-500">{order.dispatchDate?.split('T')[0] || new Date().toISOString().split('T')[0]}</div>
            </div>
          </div>

          {/* Reference Order Notice */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-blue-950">رقم طلب العميلة بنظام الوساطة: </span>
              <span className="font-black text-[#1A3668]">#{order.orderNumber || 'مباشر'}</span>
              {order.shipmentNumber && (
                <span className="mr-3 text-slate-600">| شحنة: {order.shipmentNumber}</span>
              )}
            </div>
            <div className="text-blue-900 font-bold">
              قيمة الطلب المرجعية: {order.orderOriginalValue?.toLocaleString() || 0} ريال
            </div>
          </div>

          {/* Customer & Courier Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            
            {/* Customer Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-[#1A3668] block pb-1 border-b border-slate-200">
                بيانات العميلة المستلمة:
              </span>
              <div className="font-black text-sm text-slate-900">{order.customerName}</div>
              <div className="font-mono text-slate-700 flex items-center gap-1.5" dir="ltr">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {order.customerPhone}
              </div>
              <div className="text-slate-700 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{order.governorate} {order.district ? `- ${order.district}` : ''} | {order.address}</span>
              </div>
            </div>

            {/* Courier Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="font-bold text-[#1A3668] block pb-1 border-b border-slate-200">
                الموصل المكلف بالتسليم:
              </span>
              <div className="font-black text-sm text-slate-900">{order.courierName}</div>
              {courier && (
                <>
                  <div className="font-mono text-slate-700 flex items-center gap-1.5" dir="ltr">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {courier.phone}
                  </div>
                  <div className="text-slate-600">
                    منطقة العمل: {courier.zone || courier.coverageZones}
                  </div>
                </>
              )}
              <div className="text-slate-600">
                تاريخ الاستلام: {order.dispatchDate?.split('T')[0]}
              </div>
            </div>

          </div>

          {/* Financial Breakdown (Pure Delivery Fee) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1A3668] text-white">
                <tr>
                  <th className="py-2.5 px-4 font-bold">البيان</th>
                  <th className="py-2.5 px-4 font-bold">طريقة التحصيل المقررة</th>
                  <th className="py-2.5 px-4 font-bold text-left">المبلغ المطلوب تحصيله</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    أجرة توصيل الطلب للعميلة
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {order.collectionMethod === 'cash_to_courier'
                      ? 'نقداً للموصل (يُسجل في عهدة الموصل)'
                      : order.collectionMethod === 'transfer_to_wallet'
                      ? `محولة للمحفظة (${order.walletName || 'توب ستور'})`
                      : 'معفاة / بدون تحصيل'}
                  </td>
                  <td className="py-3 px-4 font-black text-base text-left text-slate-900">
                    {order.deliveryFee.toLocaleString()} ريال
                  </td>
                </tr>
                {order.orderRemainingAmount !== undefined && order.orderRemainingAmount > 0 && (
                  <tr className="bg-amber-50/50">
                    <td className="py-2 px-4 font-bold text-amber-900">
                      متبقي من قيمة الطلب الأصلية (إن وجد)
                    </td>
                    <td className="py-2 px-4 text-amber-800">
                      يسلم لحساب المتجر
                    </td>
                    <td className="py-2 px-4 font-bold text-left text-amber-950">
                      {order.orderRemainingAmount.toLocaleString()} ريال
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signatures & Notes */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-6">
              <div className="font-bold text-slate-700">توقيع واستلام العميلة:</div>
              <div className="h-10 border-b border-dashed border-slate-400"></div>
            </div>
            <div className="space-y-6">
              <div className="font-bold text-slate-700">توقيع الموصل المستلم:</div>
              <div className="h-10 border-b border-dashed border-slate-400"></div>
            </div>
          </div>

          {/* Footer Warning */}
          <div className="text-[10px] text-slate-500 text-center pt-2">
            * هذا المستند مالي وإجرائي معتمد لدى توب ستور لتوثيق حركة الطرود وأجور التوصيل.
          </div>

        </div>

      </div>
    </div>
  );
};
