import { ChartAccount } from '../types';

export const DEFAULT_CHART_OF_ACCOUNTS: ChartAccount[] = [
  // 1. الأصول (Assets)
  {
    id: 101,
    code: '101',
    name: 'الصناديق النقدية (الخزينة الرئيسية)',
    category: 'asset',
    subCategory: 'أصول متداولة - نقدية بالصندوق',
    balanceType: 'debit',
    description: 'النقدية المتوفرة في صندوق المتجر للعمليات اليومية',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 102,
    code: '102',
    name: 'الحسابات البنكية والمحافظ الإلكترونية',
    category: 'asset',
    subCategory: 'أصول متداولة - بنوك ومحافظ',
    balanceType: 'debit',
    description: 'أرصدة حسابات بنك الكريمي، جيب، ون كاش، فلوسك، وبنك التضامن',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 110,
    code: '110',
    name: 'ذمم العملاء المدينة (حسابات العملاء)',
    category: 'asset',
    subCategory: 'أصول متداولة - مدينون',
    balanceType: 'debit',
    description: 'إجمالي المبالغ والديون المستحقة على العملاء مقابل فواتير الطلبات',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 120,
    code: '120',
    name: 'بضاعة في الطريق ومشتريات الشحنات',
    category: 'asset',
    subCategory: 'أصول متداولة - مخزون وبضاعة',
    balanceType: 'debit',
    description: 'قيمة الطلبيات المشتراة من المواقع (شي إن، علي إكسبرس) قيد الشحن',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 130,
    code: '130',
    name: 'سلف وعهد ومستحقات أخرى',
    category: 'asset',
    subCategory: 'أصول متداولة - أرصدة مدينة أخرى',
    balanceType: 'debit',
    description: 'سلف الموظفين والشركاء وعهد مناديب التوصيل النقدية',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 150,
    code: '150',
    name: 'الأصول الثابتة وتجهيزات ومعدات المتجر',
    category: 'asset',
    subCategory: 'أصول غير متداولة - أصول ثابتة',
    balanceType: 'debit',
    description: 'أجهزة الكمبيوتر، طابعات الفواتير، الديكورات وتجهيزات المقر',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // 2. الخصوم والالتزامات (Liabilities)
  {
    id: 201,
    code: '201',
    name: 'ذمم الموردين وشركات الشحن (دائنون)',
    category: 'liability',
    subCategory: 'خصوم متداولة - موردون',
    balanceType: 'credit',
    description: 'مستحقات شركات الشحن والتخليص والموردين الخارجيين',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 202,
    code: '202',
    name: 'أمانات ودفعات مقدمة من العملاء',
    category: 'liability',
    subCategory: 'خصوم متداولة - أمانات',
    balanceType: 'credit',
    description: 'عربونات ودفعات زائدة مسددة من العملاء قبل اكتمال الفواتير',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // 3. حقوق الملكية (Equity)
  {
    id: 301,
    code: '301',
    name: 'رأس المال المدفوع',
    category: 'equity',
    subCategory: 'حقوق الملكية - رأس المال',
    balanceType: 'credit',
    description: 'رأس مال المشروع والمساهمات الرأسمالية للمؤسسين',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 302,
    code: '302',
    name: 'الأرباح المبقاة والمرحلة',
    category: 'equity',
    subCategory: 'حقوق الملكية - احتياطيات وأرباح',
    balanceType: 'credit',
    description: 'صافي الأرباح المتراكمة من الفترات المالية السابقة',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 303,
    code: '303',
    name: 'جاري صاحب المنشأة والمسحوبات الشخصية',
    category: 'equity',
    subCategory: 'حقوق الملكية - جاري الملاك',
    balanceType: 'credit',
    description: 'حساب التسويات والمسحوبات الشخصية للمالك والشركاء',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // 4. الإيرادات (Revenues)
  {
    id: 401,
    code: '401',
    name: 'إيرادات المبيعات والوساطة التجارية',
    category: 'revenue',
    subCategory: 'إيرادات النشاط الرئيسي',
    balanceType: 'credit',
    description: 'إجمالي قيمة فواتير الطلبات وعمولات الشراء من المتاجر العالمية',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 402,
    code: '402',
    name: 'إيرادات رسوم وأجور التوصيل',
    category: 'revenue',
    subCategory: 'إيرادات خدمات مكملة',
    balanceType: 'credit',
    description: 'رسوم التوصيل المحصلة من العملاء داخل المدن والمحافظات',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 409,
    code: '409',
    name: 'إيرادات وأرباح متنوعة أخرى',
    category: 'revenue',
    subCategory: 'إيرادات وأرباح أخرى',
    balanceType: 'credit',
    description: 'أرباح فروق أسعار الصرف وإيرادات تشغيلية عرضية',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // 5. المصروفات (Expenses)
  {
    id: 501,
    code: '501',
    name: 'تكلفة البضاعة المباعة وتكلفة الشراء الفعلية',
    category: 'expense',
    subCategory: 'تكلفة المبيعات المباشرة',
    balanceType: 'debit',
    description: 'المبالغ المدفوعة لمواقع الشراء شي إن وعلي إكسبرس لشراء المنتجات',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 502,
    code: '502',
    name: 'مصاريف الشحن الدولي والتخليص الجمركي',
    category: 'expense',
    subCategory: 'تكاليف شحن مباشرة',
    balanceType: 'debit',
    description: 'تكاليف أوزان الشحنات الدولية وتخليص الطرود الجوية والبرية',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 503,
    code: '503',
    name: 'مصاريف التسويق والإعلانات الممولة',
    category: 'expense',
    subCategory: 'مصروفات تسويقية وبيع',
    balanceType: 'debit',
    description: 'حملات إعلانات فيسبوك وانستغرام وعمولات المؤثرين',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 504,
    code: '504',
    name: 'مصاريف أجور ورواتب ومكافآت العاملين',
    category: 'expense',
    subCategory: 'مصروفات إدارية وتشغيلية',
    balanceType: 'debit',
    description: 'رواتب موظفي المتجر، خدمة العملاء، ومكافآت الإنجاز',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 505,
    code: '505',
    name: 'مصاريف الإيجار ومرافق المقر',
    category: 'expense',
    subCategory: 'مصروفات إدارية وتشغيلية',
    balanceType: 'debit',
    description: 'إيجار مقر المتجر والكهرباء والمياه',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 506,
    code: '506',
    name: 'مصاريف الإنترنت والاتصالات والبرمجيات',
    category: 'expense',
    subCategory: 'مصروفات تشغيلية وتقنية',
    balanceType: 'debit',
    description: 'اشتراكات الإنترنت، بطاقات الشحن، وسيرفرات البرامج',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 507,
    code: '507',
    name: 'أجور وعمولات مناديب التوصيل المحلي',
    category: 'expense',
    subCategory: 'مصروفات توزيع وتوصيل',
    balanceType: 'debit',
    description: 'أجور رحلات التوصيل المسددة لمناديب ومكاتب التوصيل',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 508,
    code: '508',
    name: 'مصاريف التغليف والطباعة والقرطاسية',
    category: 'expense',
    subCategory: 'مصروفات تشغيلية',
    balanceType: 'debit',
    description: 'أكياس التغليف، اللواصق، بوالص الشحن والأوراق',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 509,
    code: '509',
    name: 'مصاريف ونثريات تشغيلية متنوعة',
    category: 'expense',
    subCategory: 'مصروفات عمومية وإدارية',
    balanceType: 'debit',
    description: 'ضيافة، نظافة، نثريات، وصيانة عامة',
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];
