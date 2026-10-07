/**
 * TOP STORE - Shipment Trajectory & Milestones
 * مسار الشحنة الثابت المعتمد في فواتير ومستندات TOP STORE
 */

export interface ShipmentMilestone {
  index: number;
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const SHIPMENT_MILESTONES: ShipmentMilestone[] = [
  {
    index: 0,
    id: 'preparation',
    label: 'تجهيز الطلب',
    shortLabel: 'تجهيز',
    icon: '📦',
    description: 'اعتماد الطلب وشراء القطع من المورد الخارجي'
  },
  {
    index: 1,
    id: 'intl_shipping',
    label: 'الشحن الخارجي',
    shortLabel: 'شحن خارجي',
    icon: '✈️',
    description: 'انطلاق الشحنة جوياً / بحرياً من مستودعات المورد'
  },
  {
    index: 2,
    id: 'customs',
    label: 'التخليص الجمركي',
    shortLabel: 'جمرك',
    icon: '🛃',
    description: 'إنهاء إجراءات التفتيش والمطابقة الجمركية'
  },
  {
    index: 3,
    id: 'saudi_hub',
    label: 'الاستلام في السعودية',
    shortLabel: 'السعودية',
    icon: '🇸🇦',
    description: 'وصول الشحنة إلى مركز التوزيع الوسيط في المملكة'
  },
  {
    index: 4,
    id: 'yemen_transit',
    label: 'الشحن إلى اليمن',
    shortLabel: 'إلى اليمن',
    icon: '🚚',
    description: 'النقل البري عبر المنافذ مع شركات النقل المعتمدة'
  },
  {
    index: 5,
    id: 'sorting',
    label: 'الفرز والتجهيز',
    shortLabel: 'فرز محلي',
    icon: '📦',
    description: 'وصول المركز الرئيسي بصنعاء، الفرز والمطابقة لكل عميل'
  },
  {
    index: 6,
    id: 'delivery',
    label: 'التوصيل',
    shortLabel: 'تسليم',
    icon: '🛵',
    description: 'التوصيل النهائي للعميل أو الاستلام من الفرع'
  }
];

export function getMilestoneIndexByStatus(
  orderStatus?: string,
  shipmentStatus?: string
): number {
  if (orderStatus === 'delivered' || shipmentStatus === 'completed') {
    return 6; // التوصيل / تم التسليم
  }

  if (orderStatus === 'shipped') {
    if (shipmentStatus === 'in_transit') {
      return 4; // الشحن إلى اليمن
    }
    if (shipmentStatus === 'pending') {
      return 2; // التخليص الجمركي
    }
    return 3; // الاستلام في السعودية
  }

  if (orderStatus === 'purchased') {
    return 1; // الشحن الخارجي
  }

  if (orderStatus === 'pending') {
    return 0; // تجهيز الطلب
  }

  return 0;
}

export function getShipmentMilestones(
  orderStatus?: string,
  shipmentNumber?: string,
  shipmentStatus?: string
): { id: string; title: string; shortTitle: string; icon: string; status: 'completed' | 'current' | 'upcoming' }[] {
  const currentIndex = getMilestoneIndexByStatus(orderStatus, shipmentStatus);
  return SHIPMENT_MILESTONES.map((m, idx) => {
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    if (idx < currentIndex) status = 'completed';
    else if (idx === currentIndex) status = 'current';
    return {
      id: m.id,
      title: m.label,
      shortTitle: m.shortLabel,
      icon: m.icon,
      status
    };
  });
}
