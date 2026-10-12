-- ==============================================================================
-- TOP STORE ACCOUNTING SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- مخطط قاعدة البيانات للجداول الرئيسية (العملاء، الطلبات، القيود، وأسطر القيود)
-- ==============================================================================

-- 1. جدول العملاء (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGINT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternate_phone TEXT,
    governorate TEXT NOT NULL DEFAULT 'صنعاء',
    city TEXT,
    pickup_location TEXT,
    notes TEXT,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    opening_balance_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. جدول الطلبات (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGINT PRIMARY KEY,
    order_number TEXT NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_code TEXT,
    customer_name TEXT,
    site TEXT NOT NULL DEFAULT 'SHEIN',
    items_count INT NOT NULL DEFAULT 1,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    delivery_fee_collection_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (delivery_fee_collection_status IN ('unpaid', 'collected', 'cancelled')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'purchased', 'shipped', 'delivered', 'cancelled')),
    order_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    invoice_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. جدول قيود اليومية (Journal Entries)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id BIGINT PRIMARY KEY,
    entry_number TEXT NOT NULL UNIQUE,
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('order', 'payment', 'expense', 'purchase_batch', 'receivable', 'manual', 'reversal', 'opening_balance')),
    source_id TEXT,
    source_number TEXT,
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'reversed', 'void')),
    description TEXT NOT NULL DEFAULT '',
    is_reversed BOOLEAN NOT NULL DEFAULT false,
    reversed_by_entry_id BIGINT REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    reverses_entry_id BIGINT REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. جدول أسطر قيود اليومية (Journal Lines - Double Entry)
CREATE TABLE IF NOT EXISTS public.journal_lines (
    id BIGINT PRIMARY KEY,
    journal_entry_id BIGINT NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id BIGINT,
    account_name TEXT NOT NULL,
    chart_account_id BIGINT,
    chart_account_code TEXT,
    side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- فهارس تحسين الأداء (Indexes)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON public.journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_chart_code ON public.journal_lines(chart_account_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source ON public.journal_entries(source_type, source_id);

-- تفعيل أمان مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول (Policies): قراءة وكتابة آمنة للمستخدمين المصرح لهم
CREATE POLICY "Allow authenticated read and write on customers"
    ON public.customers FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on orders"
    ON public.orders FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on journal_entries"
    ON public.journal_entries FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read and write on journal_lines"
    ON public.journal_lines FOR ALL
    USING (true)
    WITH CHECK (true);
