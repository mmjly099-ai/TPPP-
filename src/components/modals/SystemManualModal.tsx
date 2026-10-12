import React, { useState } from 'react';
import {
  X,
  Printer,
  BookOpen,
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Bike,
  Receipt,
  FileText,
  PackageCheck,
  Megaphone,
  Users,
  Wallet,
  Truck,
  Scale,
  Bot,
  UploadCloud,
  Settings,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

interface SystemManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: any) => void;
}

export const SystemManualModal: React.FC<SystemManualModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const sections = [
    {
      id: 'dashboard',
      tabKey: 'dashboard',
      title: '1. لوحة التحكم المركزية (Dashboard)',
      subtitle: 'مركز القيادة المالي والإحصائي اللحظي',
      icon: LayoutDashboard,
      badge: 'إداري / محاسبي',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description:
        'توفر لوحة التحكم قراءة لحظية وشاملة لصحة المتجر المالية عبر بطاقات رقمية ورسوم بيانية تفاعلية تلخص التدفقات النقدية والعمليات الجارية في ثانية واحدة.',
      features: [
        'إجمالي السيولة الحالية: أرصدة كافة الصناديق والمحافظ الإلكترونية (جيب، الكريمي، ون كاش، الكاش، البطاقات).',
        'مجموع ديون العملاء: رصيد الذمم المدينة المستحقة على الزبائن للطلبيات غير المسددة بالكامل.',
        'إجمالي المبيعات والإيرادات: مقارنة الفترات الزمنية ومراقبة حجم نمو الطلبيات.',
        'مخططات حركة السيولة الشهرية والأسبوعية، وتوزيع الإيرادات والمصروفات حسب الفئات.',
        'أزرار الإجراءات السريعة: فتح طلب جديد، تسجيل سند قبض، تسجيل مصروف، وإجراء تحويل فوري.'
      ],
      userGuide:
        'ابدأ يومك دائماً بمراجعة هذه الشاشة لمراقبة السيولة النقدية المتوفرة والتأكد من عدم وجود عجز مالي قبل الشراء للطلبيات الجديدة.'
    },
    {
      id: 'analytics',
      tabKey: 'analytics',
      title: '2. مركز التحليلات والتقارير الذكية (Analytics Center)',
      subtitle: 'ذكاء الأعمال والمحاسبة الإدارية',
      icon: BarChart3,
      badge: 'تحليلي متقدم',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description:
        'يقدم تقارير معمقة حول سلوك الشراء، هوامش الربح الحقيقية، كفاءة المصاريف التشغيلية، ومؤشرات الأداء الرئيسية (KPIs).',
      features: [
        'تحليل صافي الربح الحقيقي بعد خصم تكاليف الشراء، الشحن الداخلي والخارجي، وأجور الموصلين.',
        'مصفوفة كبار العملاء: ترتيب العملاء حسب حجم المشتريات ومعدل سرعة السداد.',
        'تحليل المصروفات التشغيلية: توزيع التكاليف على النقل، الدعاية، الإيجارات، ومصاريف العمال.',
        'مقارنة المبيعات بين فترات مختلفة مع إمكانية تصدير الرسوم البيانية.'
      ],
      userGuide:
        'يستخدم هذا القسم أسبوعياً وشهرياً لتقييم الجدوى الاقتصادية واكتشاف أوجه الصرف غير المبررة لتعظيم صافي الأرباح.'
    },
    {
      id: 'orders',
      tabKey: 'orders',
      title: '3. إدارة الطلبات والتسوق (Orders Management)',
      subtitle: 'شريان العمليات لوساطة الشراء من شي إن وعلي إكسبرس',
      icon: ShoppingBag,
      badge: 'عمليات يومية',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description:
        'متابعة شاملة لكل طلبية من لحظة فتح الطلب ودفع العربون، وحتى الشراء الخارجي، والشحن، والتسليم النهائي مع احتساب الأرباح بدقة.',
      features: [
        'تسجيل الطلب بالريال اليمني والعملات الأجنبية مع تحديد هامش الربح والعمولة.',
        'متابعة حالات الطلب: (جديد، مدفوع عربون، قيد الشراء، تم الشحن الخارجي، وصل صنعاء، مع المندوب، تم التسليم).',
        'الربط المالي التلقائي: إنشاء قيد محاسبي مدين للعميل ودائن لحساب الإيرادات تلقائياً.',
        'نظام التعديل المالي الآمن، وفصل دفعات العربون والتحصيل مع طباعة فاتورة رسمية بنقرة واحدة.'
      ],
      userGuide:
        'عند استقبال أي عميلة، سجل طلبها من زر (طلب جديد)، وحدد المحفظة المستلمة للعربون إن وُجد ليتم ترحيل القيد وفتح ذمة للعميلة آلياً.'
    },
    {
      id: 'couriers',
      tabKey: 'couriers',
      title: '4. نظام الموصّلين والمناديب وتوصيل الطلبات (Couriers System)',
      subtitle: 'إدارة أسطول التوصيل وتسوية العهد المالية بدقة متناهية',
      icon: Bike,
      badge: 'لوجستي ومحاسبي',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      description:
        'منظومة متكاملة لربط مناديب التوصيل، إنشاء رحلات التوزيع، تتبع الكاش المحصل مع المندوب، وتسوية عمولات التوصيل دون أي ثغرة اختلاس.',
      features: [
        'سجل الموصلين: بيانات كل مندوب، رقم هاتفه، نوع وسيلة النقل، ورصيد عهدته النقدية الحالية.',
        'إسناد الطلبيات للمندوب وتغيير حالتها إلى "خارج للتوصيل".',
        'تسوية الكاش (Receive Cash): استلام مبالغ الطلبيات من المندوب وإيداعها في صندوق المحل أو المحفظة.',
        'سداد مستحقات التوصيل (Settle Courier Payable): صرف عمولة المندوب مع قيد محاسبي تلقائي لمصروف التوصيل.',
        'كشف حساب الموصل الشامل الذي يوضح الطلبات المسلمة والمبالغ المستحقة والمسددة.'
      ],
      userGuide:
        'عند عودة المندوب نهاية اليوم، افتح قسم الموصلين -> اختر المندوب -> اضغط (استلام كاش) لتحصيل المبالغ وإيداعها في الصندوق، ثم اضغط (سداد أجرة) لصرف عمولته.'
    },
    {
      id: 'installments',
      tabKey: 'installments',
      title: '5. دفعات الطلبات والتحصيل (Installments & Collections)',
      subtitle: 'تتبع المستحقات المتبقية وتسهيل سداد الأقساط',
      icon: Receipt,
      badge: 'محاسبة المدفوعات',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description:
        'مخصص لمتابعة الطلبيات غير المسددة بالكامل، وجدولة الدفعات، وتسجيل كل عملية سداد جديدة مع طباعة سند قبض فوري للعميلة.',
      features: [
        'فلترة الطلبيات التي عليها متبقي مالي مع تصنيفها حسب تأخر السداد.',
        'نافذة سداد سريعة تسجل المبلغ المدفوع، محفظة الاستلام، والتاريخ.',
        'تحديث تلقائي لمتبقي الطلب ورصيد ذمة العميل في ثانية واحدة.',
        'توليد قيد يومية فوري (مدين: محفظة الاستلام / دائن: ذمة العميل) لضمان توازن الحسابات.'
      ],
      userGuide:
        'عند سداد أي عميلة لقسط أو دفعة متبقية، توجه لهذا القسم واضغط "تسجيل دفعة" على طلبها، واختر الحساب المستلم ليتم ضبط الرصيد فوراً.'
    },
    {
      id: 'invoices',
      tabKey: 'invoices',
      title: '6. الفواتير وسندات القبض والكشوفات (Invoices & Vouchers)',
      subtitle: 'المركز الوثائقي الرسمي للمستندات والطباعة الفورية',
      icon: FileText,
      badge: 'وثائق رسمية',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description:
        'إصدار، معاينة، وطباعة كافة المستندات الورقية والإلكترونية بـ هيدر وشعار المتجر الرسمي (TOP STORE) بصيغة PDF مهيأة للطباعة والمشاركة عبر واتساب.',
      features: [
        'فواتير الطلبات الرسمية المشتملة على بيانات الأصناف، الأسعار، العرابين، والمتبقي مع الشروط والأحكام.',
        'سندات القبض المالية المرقمة تسلسلياً مع توضيح المستلم وطريقة الدفع.',
        'كشوفات حسابات العملاء التفصيلية التي توضح الرصيد السابق، الحركات، والرصيد النهائي.',
        'زر تصدير وطباعة مباشر (A4 ونصف A4) متوافق مع كافة الطابعات العادية والحرارية.'
      ],
      userGuide:
        'استخدم زر "معاينة وطباعة" بجانب أي طلبية أو سند لإرسال الفاتورة للعميل كملف PDF عبر واتساب بضغطة زر.'
    },
    {
      id: 'purchase-batches',
      tabKey: 'purchase-batches',
      title: '7. دفعات الشراء المجمعة (Purchase Batches)',
      subtitle: 'إدارة وتجميع سلات الشراء بالبطاقات البنكية الدولية',
      icon: PackageCheck,
      badge: 'مشتريات دولية',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      description:
        'تنظيم شراء طلبيات المواقع العالمية (Shein, AliExpress) في سلات مجمعة وتتبع مصاريف السحب من بطاقات الفيزا والماستركارد.',
      features: [
        'تجميع عدة طلبات في دفعة شراء واحدة برقم تتبع سلة مالي.',
        'خصم تكلفة الشراء الإجمالية بالدولار أو الريال من محفظة الفيزا أو البنك المخصص.',
        'توليد قيود تسوية مجمعة بين تكلفة البضاعة المباعة ومحافظ الدفع الدولية.',
        'تسجيل أرقام العمليات البنكية وفروقات أسعار الصرف لتحقيق أعلى دقة ممكنة.'
      ],
      userGuide:
        'عند قيامك بالشراء من موقع شي إن بالفيزا، اجمع الطلبيات المشحونة معاً في دفعة واحدة ليسهل مطابقة رصيد بطاقتك البنكية مع مشتريات اليوم.'
    },
    {
      id: 'marketing',
      tabKey: 'marketing',
      title: '8. التسويق والعائد الإعلاني ROAS و CAC (Marketing & Growth)',
      subtitle: 'قياس كفاءة الحملات الإعلانية ومصادر اكتساب العملاء',
      icon: Megaphone,
      badge: 'نمو وتسويق',
      badgeColor: 'bg-pink-100 text-pink-800 border-pink-300',
      description:
        'تتبع إنفاق الحملات الترويجية الممولة على إنستغرام، فيسبوك، وسناب شات وربطها بالمبيعات الناتجة لحساب العائد الفعلي.',
      features: [
        'حساب العائد على الإنفاق الإعلاني (ROAS): كم ريال دخل للمتجر مقابل كل ريال صُرف في الإعلان.',
        'حساب تكلفة اكتساب العميل (CAC - Customer Acquisition Cost).',
        'متابعة أداء أكواد الخصم الترويجية ومندوبي التسويق والمشاهير.',
        'الربط المحاسبي التلقائي لمصاريف التسويق مع حساب مصاريف الدعاية والإعلان.'
      ],
      userGuide:
        'سجل أي حملة إعلانية جديدة وتكلفتها، وعند تسجيل الطلبات اختر كود الحملة لمعرفة أرباح كل حملة بدقة.'
    },
    {
      id: 'customers',
      tabKey: 'customers',
      title: '9. سجل العملاء والذمم المدينة (Customers & CRM)',
      subtitle: 'قاعدة بيانات الزبائن وتاريخ مشترياتهم ومديونياتهم',
      icon: Users,
      badge: 'علاقات عملاء',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      description:
        'ملف شخصي لكل عميلة يضم أرقام التواصل، العنوان، مجموع مشترياتها التاريخية، والرصيد الحالي المستحق عليها.',
      features: [
        'إضافة وتعديل بيانات العملاء والبحث الفوري بالاسم أو رقم الهاتف.',
        'كشف حساب تفصيلي للعميل بضغطة زر يوضح كل طلب وسند قبض وتاريخه.',
        'إرسال إشعار وكشف حساب للعميل عبر واتساب مباشرة.',
        'حماية الحسابات من الحذف غير المبرر إذا كان العميل يمتلك طلبيات أو ديون معلقة.'
      ],
      userGuide:
        'استخدم حقل البحث للوصول لأي عميل في ثوانٍ، أو اضغط على أيقونة الفاتورة لفتح كشف حسابه وطباعته.'
    },
    {
      id: 'accounts',
      tabKey: 'accounts',
      title: '10. الصناديق والمحافظ المالية (Wallets & Bank Accounts)',
      subtitle: 'إدارة الخزينة ومحفظة جيب والكريمي والتحويلات البينية',
      icon: Wallet,
      badge: 'الخزينة والمحافظ',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      description:
        'مرآة حقيقية لجميع أرصدة النقدية في المتجر: الصندوق الرئيسي (كاش المحل)، محفظة جيب، حساب الكريمي المميز، ون كاش، وفيزا المشتريات.',
      features: [
        'عرض الأرصدة الحالية في كل محفظة وصندوق لحظياً مع إجمالي السيولة النقدية.',
        'إجراء تحويلات فورية بين المحافظ (مثال: تحويل من جيب إلى الكريمي) مع قيد مزدوج آلي.',
        'سجل حركات المحفظة: كشف تفصيلي بكل إيداع أو سحب أو عمولة بنكية تمت.',
        'إمكانية إضافة حساب أو محفظة جديدة وتحديد نوعها والعملة.'
      ],
      userGuide:
        'طابق يومياً رصيد محفظة جيب وتطبيق الكريمي في هاتفك مع الأرقام الظاهرة في هذه الشاشة للتأكد من انضباط الصندوق.'
    },
    {
      id: 'expenses',
      tabKey: 'expenses',
      title: '11. المصاريف والتشغيل اليومي (Operating Expenses)',
      subtitle: 'الرقابة الصارمة على تكاليف التشغيل والنفقات العامة',
      icon: Receipt,
      badge: 'نفقات ومصروفات',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      description:
        'توثيق كل ريال يُصرف في المتجر مع تبويبه محاسبياً ضمن بنود التكاليف المعتمدة وفق المعايير المالية.',
      features: [
        'تصنيفات المصاريف: شحن خارجي، توصيل داخلي، إيجار، إنترنت واتصالات، قرطاسية، وتكاليف عامة.',
        'تحديد الخزينة أو المحفظة التي تم الدفع منها لخصم المبلغ تلقائياً وتوليد قيد يومية.',
        'إرفاق تفاصيل وتاريخ وسند لكل عملية صرف لمنع الهدر والتكرار.',
        'تقارير تحليلية ومخططات بيانية توضح أوجه النزيف المالي وترشيد الإنفاق.'
      ],
      userGuide:
        'سجل كل مصروف في وقته عبر زر (تسجيل مصروف) وحدد الصندوق المصروف منه لتظل حسابات السيولة مضبوطة تماماً.'
    },
    {
      id: 'workers',
      tabKey: 'workers',
      title: '12. إدارة العمال وصرفياتهم والسلف (Workers & Daily Petty Cash)',
      subtitle: 'إدارة شؤون الموظفين، السلفيات، وصرفيات القات والعشاء اليومية',
      icon: Users,
      badge: 'شؤون موظفين',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description:
        'مخصص للبيئة المحلية اليمنية لمتابعة عمال وموظفي المتجر، وتسجيل نفقات اليوميات، وصرفيات القات، العشاء، المواواصلات، والسلف المؤقتة.',
      features: [
        'سجل كامل للعمال مع تحديد مسمياتهم ورواتبهم الشهرية أو أجورهم اليومية.',
        'تسجيل صرفية عامل بنقرة سريعة مع تحديد النوع (قات، عشاء، مواصلات، سلفة نقدية).',
        'كشف حساب مستقل لكل عامل يوضح إجمالي ما استلمه وما تبقى من راتبه أو ذمته.',
        'قيد محاسبي آلي في شجرة الحسابات يخصم من الصندوق ويحمل على مصروفات الموظفين أو عهد العمال.'
      ],
      userGuide:
        'عند إعطاء أي عامل مبلغاً للقات أو العشاء أو سلفة، اختر اسمه وسجل المبلغ فوراً من هذه الشاشة لتجنب نسيان الصرفيات الصغيرة.'
    },
    {
      id: 'shipments',
      tabKey: 'shipments',
      title: '13. الشحنات وشركات النقل اللوجستي (Shipments & Logistics)',
      subtitle: 'تتبع كراتين وطليات الشحن مع شركات النقل (المهيب، القدسي وغيرها)',
      icon: Truck,
      badge: 'شحن ولوجستيات',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      description:
        'متابعة الشحنات القادمة من الخارج، بوالص الشحن، أوزان الطرود، وتكاليف النقل المسددة والمستحقة لشركات الشحن.',
      features: [
        'إدخال بيانات الشحنة، شركة النقل، رقم التتبع (Tracking Number)، وتاريخ الشحن والوصول.',
        'احتساب تكلفة الكيلوجرام والطرود وربطها بطلبات العملاء لتوزيع التكاليف بعدالة.',
        'تسوية الحسابات مع مكاتب النقل (سداد رسوم الشحن وإصدار قيود محاسبية).',
        'مراقبة الطرود المتأخرة لتسريع وصولها إلى العميلات في صنعاء وبقية المحافظات.'
      ],
      userGuide:
        'عند وصول طرد جديد من مكتب الشحن، سجل بياناته وتكلفته في هذا القسم وحدد الطلبيات التي يحويها لتغيير حالتها إلى "وصل صنعاء".'
    },
    {
      id: 'journal',
      tabKey: 'journal',
      title: '14. قيود اليومية ودفتر الأستاذ (General Journal & Ledger)',
      subtitle: 'العمود الفقري المحاسبي بنظام القيد المزدوج المتوازن',
      icon: BookOpen,
      badge: 'محاسبة عامة',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      description:
        'محرك محاسبي صارم يطبق المعايير الدولية (مدين = دائن). كل حركة بيع، شراء، سداد، أو تحويل في النظام تولد قيداً مزدوجاً تلقائياً مع حماية كاملة ضد التعديل العشوائي.',
      features: [
        'عرض كامل لقيود اليومية مع أرقامها، أطراف القيد، المبالغ، والبيان التوضيحي.',
        'تدقيق التوازن الفوري: مؤشر يوضح تطابق إجمالي المدين والدائن مع تنبيه صارم عند أي خلل.',
        'دفتر الأستاذ العام (General Ledger) وحركات كل حساب في شجرة الحسابات.',
        'ميزان المراجعة وقائمة المركز المالي والميزانية العمومية المولدة آلياً.'
      ],
      userGuide:
        'يستخدم المحاسب هذا القسم للتدقيق وإجراء قيود التسوية أو الإهلاك السنوية مع التأكد دائماً أن إجمالي المدين يساوي الدائن تماماً.'
    },
    {
      id: 'receivables',
      tabKey: 'receivables',
      title: '15. الذمم المدينة وحقوق الملكية والشركاء (Receivables & Equity)',
      subtitle: 'إدارة رؤوس أموال المؤسسين والمسحوبات الشخصية والسلف الخارجية',
      icon: Scale,
      badge: 'رأس مال وشركاء',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      description:
        'فصل مالية الشركاء عن مالية المتجر، وتسجيل الحصص الرأسمالية، المسحوبات الشخصية، وأي قروض أو ذمم خارجية.',
      features: [
        'متابعة رأس مال كل شريك وحصته من الأرباح المبقاة.',
        'تسجيل مسحوبات الشركاء النقدية والعينية مع قيود تخفيض حقوق الملكية بدقة.',
        'إدارة السلف الخارجية والديون المستحقة للمتجر من غير العملاء الاعتياديين.',
        'كشف مالي مستقل لحساب جاري الشريك يوضح رصيده الدائن أو المدين.'
      ],
      userGuide:
        'يضمن هذا القسم عدم خلط أموال المتجر مع المصاريف الشخصية للمؤسسين، مما يوفر الشفافية والوضوح المالي الكامل.'
    },
    {
      id: 'assistant',
      tabKey: 'assistant',
      title: '16. المحلل الذكي وفاحص النظام (TOP STORE AI Assistant)',
      subtitle: 'مستشارك المالي والتقني الذكي المدعوم بالذكاء الاصطناعي',
      icon: Bot,
      badge: 'ذكاء اصطناعي',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      description:
        'مساعد ذكي يقرأ ويدقق كافة قواعد البيانات والحركات المالية للمتجر لحظياً، ويجيب على استفساراتك الإدارية ويقدم توصيات لزيادة الأرباح.',
      features: [
        'فحص سلامة النظام والبيانات بنقرة واحدة (13 فحص سلامة وتدقيق مالي متقدم).',
        'إجابة فورية عن الأسئلة: (كم ربحنا هذا الشهر؟ ما هي أكثر الأصناف طلباً؟ من هي أكثر عميلة مديونة؟).',
        'تنبيهات فورية عند وجود ديون متعثرة أو تضارب في الصناديق.',
        'نصائح تسويقية وتشغيلية مستخلصة مباشرة من أرقام متجرك الفعلية.'
      ],
      userGuide:
        'اطرح أي سؤال في شات المساعد مثل: "اعطني تقرير مبيعات الأسبوع" أو اضغط "فحص سلامة البيانات" ليتأكد النظام من صحة حساباتك كاملة.'
    },
    {
      id: 'data-import',
      tabKey: 'data-import',
      title: '17. استيراد وترحيل البيانات (Data Import & Migration)',
      subtitle: 'ترحيل ملفات Excel و CSV و JSON إلى النظام بدون أخطاء',
      icon: UploadCloud,
      badge: 'بيانات وترحيل',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      description:
        'أداة متطورة تمكنك من نقل عملائك وطلبياتك القديمة من ملفات الإكسل إلى قاعدة بيانات النظام مع التحقق التلقائي من عدم تكرار الأرقام.',
      features: [
        'معاينة البيانات قبل حفظها لتصحيح الأعمدة والأخطاء الإملائية.',
        'منع تكرار العملاء بناءً على رقم الهاتف، ومنع تكرار أرقام الطلبيات.',
        'تحميل قوالب Excel و CSV جاهزة ومعبأة مسبقاً لتسهيل تعبئة البيانات.',
        'تقارير تفصيلية بعد الترحيل توضح عدد السجلات الناجحة والمستبعدة.'
      ],
      userGuide:
        'قم بتحميل النموذج التجريبي، واملأ بيانات عملائك أو طلباتك القديمة فيه، ثم ارفعه هنا ليتم إضافتهم للنظام بضغطة زر واحدة.'
    },
    {
      id: 'settings',
      tabKey: 'settings',
      title: '18. إعدادات المتجر والنسخ الاحتياطي (Store Settings & Backup)',
      subtitle: 'التحكم بالهوية، العملات، المزامنة، وحفظ نسخ الأمان السحابية',
      icon: Settings,
      badge: 'إعدادات وأمان',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      description:
        'المركز الإداري لضبط اسم المتجر، الشعار، أرقام التواصل، أسعار صرف العملات، والنسخ الاحتياطي الآمن لكامل قاعدة البيانات.',
      features: [
        'تعديل اسم المتجر، العنوان، ورقم الهاتف الذي يظهر في ترويسة الفواتير وسندات القبض.',
        'تصدير نسخة احتياطية مشفرة بضغطة زر بصيغة JSON تحتوي على كل عملية في النظام.',
        'استعادة النسخ الاحتياطية عند الحاجة دون فقدان أي بيانات سابقة.',
        'مزامنة سحابية مركزية تضمن عمل كافة الأجهزة (الكمبيوتر، الجوال، التابلت) على نفس البيانات لحظياً.'
      ],
      userGuide:
        'احرص أسبوعياً على الضغط على زر "تصدير نسخة احتياطية (JSON)" وحفظ الملف على فلاش أو بريدك لضمان أمان بياناتك دائماً.'
    }
  ];

  const filteredSections = sections.filter(sec => {
    const matchesCategory = selectedSection === 'all' || sec.id === selectedSection;
    const matchesSearch =
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-4 flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-linear-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-t-2xl flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/30 shadow-xs">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">دليل نظام TOP STORE المحاسبي الشامل</h2>
                <span className="text-[11px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/30">
                  إصدار 2026 الرسمي
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                شرح تفصيلي لكافة أقسام ووحدات النظام والمنطق المحاسبي وكيفية العمل على الأجهزة المختلفة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-amber-900 text-xs font-bold shadow-md hover:bg-amber-50 transition-all cursor-pointer"
              title="طباعة الدليل أو حفظه كـ PDF"
            >
              <Printer className="w-4 h-4 text-amber-700" />
              <span>طباعة / حفظ PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Cover for PDF Print */}
        <div className="hidden print:block p-8 border-b-2 border-amber-600 text-center mb-6">
          <div className="text-2xl font-black text-slate-900 mb-1">TOP STORE – توب ستور</div>
          <div className="text-sm font-bold text-amber-700 mb-3">الدليل التشغيلي والمحاسبي المعتمد لكافة أقسام النظام</div>
          <p className="text-xs text-slate-600 max-w-xl mx-auto">
            دليل رسمي يشرح تفصيلاً 18 وحدة محاسبية ولوجستية وإدارية تعمل بمزامنة مركزية وفورية لمتجر TOP STORE لوساطة الشراء والتسوق الإلكتروني.
          </p>
          <div className="text-[11px] text-slate-400 mt-2 font-mono">
            تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} | صنعاء - اليمن
          </div>
        </div>

        {/* Search & Filter Bar (Screen Only) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="ابحث عن قسم معين (مثال: الموصلين، الفيزا، القيود، الشحن، العمال)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
            <button
              onClick={() => setSelectedSection('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedSection === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              جميع الأقسام ({sections.length})
            </button>
            <button
              onClick={() => setSelectedSection('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedSection === 'orders'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              الطلبات
            </button>
            <button
              onClick={() => setSelectedSection('couriers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedSection === 'couriers'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              الموصّلين
            </button>
            <button
              onClick={() => setSelectedSection('accounts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedSection === 'accounts'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              الصناديق والمحافظ
            </button>
            <button
              onClick={() => setSelectedSection('journal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedSection === 'journal'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              القيود المحاسبية
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 print:overflow-visible print:space-y-8">
          
          {/* Quick System Summary Alert */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 print:bg-slate-50 print:border-slate-300">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold text-amber-950 block mb-0.5">
                ميزة المزامنة السحابية الفورية وتعدد الأجهزة في TOP STORE:
              </strong>
              تم بناء النظام ليعمل بكفاءة عبر أجهزة متعددة متزامنة (حاسوب الإدارة، لابتوب المحاسب، جوال المندوب، والتابلت) بنفس الوقت. كل عملية حفظ تتم بمصادقة أمان وتحديث فوري لكافة الشاشات بدون الحاجة لإعادة تحميل الصفحة، مع الحفاظ الصارم على توازن القيد المزدوج وسلامة البيانات.
            </div>
          </div>

          {/* Sections List */}
          <div className="grid grid-cols-1 gap-5">
            {filteredSections.map(sec => {
              const IconComp = sec.icon;
              return (
                <div
                  key={sec.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 transition-all shadow-xs print:break-inside-avoid print:border-slate-300 print:shadow-none"
                >
                  {/* Section Title Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">{sec.title}</h3>
                        <p className="text-xs text-slate-500">{sec.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sec.badgeColor}`}>
                        {sec.badge}
                      </span>
                      {onNavigateToTab && (
                        <button
                          onClick={() => {
                            onNavigateToTab(sec.tabKey);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors print:hidden cursor-pointer"
                        >
                          <span>فتح القسم</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-700 leading-relaxed mb-3">
                    {sec.description}
                  </p>

                  {/* Core Features */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3">
                    <span className="text-[11px] font-black text-slate-900 block mb-2">
                      أهم المهام والإمكانيات في هذا القسم:
                    </span>
                    <ul className="space-y-1.5">
                      {sec.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Best Practice / Practical Tip */}
                  <div className="text-xs bg-amber-50/60 border border-amber-200/60 rounded-xl p-2.5 text-amber-900 flex items-center gap-2">
                    <span className="font-bold text-amber-950 shrink-0">نصيحة الاستخدام:</span>
                    <span className="text-[11px]">{sec.userGuide}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSections.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">لا يوجد قسم يطابق بحثك الحالي</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSection('all');
                }}
                className="mt-2 text-xs text-amber-600 underline font-bold cursor-pointer"
              >
                إعادة ضبط البحث
              </button>
            </div>
          )}

          {/* Safety & Accounting Rules */}
          <div className="border-t border-slate-200 pt-6 mt-6 print:break-inside-avoid">
            <h4 className="text-sm font-black text-slate-900 mb-2">
              القواعد الذهبية للانضباط المحاسبي في متجر TOP STORE:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <strong className="block font-bold text-slate-900 mb-1">1. توثيق الاستلام الفوري:</strong>
                لا تستلم أي نقد أو حوالة من عميلة دون إصدار سند قبض فوري لها لتوثيق الحركة محاسبياً.
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <strong className="block font-bold text-slate-900 mb-1">2. مطابقة الصناديق اليومية:</strong>
                قم بمطابقة الكاش الفعلي مع رصيد حساب الصندوق في النظام نهاية كل دوام عمل لمنع الفروقات.
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <strong className="block font-bold text-slate-900 mb-1">3. النسخ الاحتياطي الدوري:</strong>
                حمّل نسخة JSON احتياطية أسبوعياً من شاشة الإعدادات لحفظ بياناتك في أمان تام.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            يمكنك طباعة هذا الدليل بالكامل أو حفظه كملف <strong>PDF</strong> بالضغط على زر الطباعة أعلاه.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الدليل الكامل</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
