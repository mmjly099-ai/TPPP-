import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Customer, Order, JournalEntry, JournalLine, TopStoreBackup } from '../types';

/**
 * Supabase Environment Credentials
 * Supports VITE_ prefix for browser/Vite context and process.env for Node/Server context.
 */
const getEnvVar = (viteKey: string, standardKey: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const val = (import.meta as any).env[viteKey] || (import.meta as any).env[standardKey];
    if (val) return String(val).trim();
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[viteKey] || process.env[standardKey];
    if (val) return String(val).trim();
  }
  return '';
};

export const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL');
export const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

let runtimeUrl: string | null = null;
let runtimeAnonKey: string | null = null;
try {
  if (typeof localStorage !== 'undefined') {
    runtimeUrl = localStorage.getItem('topstore_supabase_url') || null;
    runtimeAnonKey = localStorage.getItem('topstore_supabase_anon_key') || null;
  }
} catch (e) {
  // ignore
}

export function sanitizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  try {
    const parsed = new URL(clean);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return clean.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  }
}

export function setRuntimeSupabaseConfig(url: string, anonKey: string) {
  runtimeUrl = sanitizeSupabaseUrl(url);
  runtimeAnonKey = anonKey.trim();
  try {
    if (runtimeUrl) localStorage.setItem('topstore_supabase_url', runtimeUrl);
    else localStorage.removeItem('topstore_supabase_url');

    if (runtimeAnonKey) localStorage.setItem('topstore_supabase_anon_key', runtimeAnonKey);
    else localStorage.removeItem('topstore_supabase_anon_key');
  } catch (e) {
    // ignore
  }
  supabaseClientInstance = null; // reset client to reinitialize
}

export function getActiveSupabaseConfig(): { url: string; anonKey: string; source: 'env' | 'custom' | 'none' } {
  const url = runtimeUrl || SUPABASE_URL || '';
  const key = runtimeAnonKey || SUPABASE_ANON_KEY || '';
  let source: 'env' | 'custom' | 'none' = 'none';
  if (runtimeUrl && runtimeAnonKey) source = 'custom';
  else if (SUPABASE_URL && SUPABASE_ANON_KEY) source = 'env';
  return { url, anonKey: key, source };
}

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Checks if Supabase connection credentials are configured.
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getActiveSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

/**
 * Initializes and returns the Supabase client instance.
 * Returns null if environment variables are not configured.
 */
export function initSupabase(): SupabaseClient | null {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const { url, anonKey } = getActiveSupabaseConfig();
  if (!url || !anonKey || !url.startsWith('http')) {
    return null;
  }

  try {
    supabaseClientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return supabaseClientInstance;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tests live connection to Supabase database.
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message?: string }> {
  const client = initSupabase();
  if (!client) {
    return { ok: false, message: 'Supabase credentials not set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)' };
  }

  try {
    // Attempt lightweight query on customers or health check
    const { error } = await client.from('customers').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // If table does not exist yet, we still know endpoint replied
      return { ok: true, message: `Connected to Supabase (Table status: ${error.message})` };
    }
    return { ok: true, message: 'Supabase connection successful' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Connection failed' };
  }
}

/**
 * Migrates local data store (from localStorage or backup) to Supabase tables.
 */
export async function migrateLocalDataToSupabase(data: TopStoreBackup): Promise<{
  success: boolean;
  insertedCounts: Record<string, number>;
  errors: string[];
}> {
  const client = initSupabase();
  const result = {
    success: false,
    insertedCounts: {
      customers: 0,
      orders: 0,
      journalEntries: 0,
      journalLines: 0,
    },
    errors: [] as string[],
  };

  if (!client) {
    result.errors.push('Supabase client is not configured');
    return result;
  }

  const { tables } = data;

  try {
    // 1. Migrate Customers
    if (tables.customers && tables.customers.length > 0) {
      const customersPayload = tables.customers.map((c: Customer) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        phone: c.phone,
        alternate_phone: c.alternatePhone || null,
        governorate: c.governorate,
        city: c.city || null,
        pickup_location: c.pickupLocation || null,
        notes: c.notes || null,
        opening_balance: parseFloat(String(c.openingBalance || 0)),
        opening_balance_date: c.openingBalanceDate || null,
        status: c.status || 'active',
        created_at: c.createdAt || new Date().toISOString(),
      }));

      const { error: custErr } = await client
        .from('customers')
        .upsert(customersPayload, { onConflict: 'id' });

      if (custErr) result.errors.push(`Customers migration warning: ${custErr.message}`);
      else result.insertedCounts.customers = customersPayload.length;
    }

    // 2. Migrate Orders
    if (tables.orders && tables.orders.length > 0) {
      const ordersPayload = tables.orders.map((o: Order) => ({
        id: o.id,
        order_number: String(o.orderNumber),
        customer_id: o.customerId,
        customer_code: o.customerCode || null,
        customer_name: o.customerName || null,
        site: o.site || 'Other',
        items_count: o.itemsCount || 0,
        subtotal: o.subtotal || 0,
        discount: o.discount || 0,
        shipping_fee: o.shippingFee || 0,
        total_amount: o.totalAmount || 0,
        paid_amount: o.paidAmount || 0,
        remaining_amount: o.remainingAmount || 0,
        delivery_fee: o.deliveryFee || 0,
        delivery_fee_collection_status: o.deliveryFeeCollectionStatus || 'unpaid',
        status: o.status || 'pending',
        order_date: o.orderDate || new Date().toISOString(),
        invoice_number: o.invoiceNumber || null,
        notes: o.notes || null,
        created_at: o.createdAt || new Date().toISOString(),
      }));

      const { error: ordErr } = await client
        .from('orders')
        .upsert(ordersPayload, { onConflict: 'id' });

      if (ordErr) result.errors.push(`Orders migration warning: ${ordErr.message}`);
      else result.insertedCounts.orders = ordersPayload.length;
    }

    // 3. Migrate Journal Entries
    if (tables.journalEntries && tables.journalEntries.length > 0) {
      const entriesPayload = tables.journalEntries.map((je: JournalEntry) => ({
        id: je.id,
        entry_number: je.entryNumber,
        source_type: je.sourceType || 'manual',
        source_id: je.sourceId ? String(je.sourceId) : null,
        source_number: je.sourceNumber || null,
        status: je.status || 'posted',
        description: je.description || '',
        is_reversed: Boolean(je.isReversed),
        reversed_by_entry_id: je.reversedByEntryId || null,
        reverses_entry_id: je.reversesEntryId || null,
        created_at: je.createdAt || new Date().toISOString(),
      }));

      const { error: jeErr } = await client
        .from('journal_entries')
        .upsert(entriesPayload, { onConflict: 'id' });

      if (jeErr) result.errors.push(`Journal entries migration warning: ${jeErr.message}`);
      else result.insertedCounts.journalEntries = entriesPayload.length;
    }

    // 4. Migrate Journal Lines
    const allLines: JournalLine[] = tables.journalLines && tables.journalLines.length > 0
      ? tables.journalLines
      : (tables.journalEntries || []).flatMap(je => je.lines || []);

    if (allLines.length > 0) {
      const linesPayload = allLines.map((l: JournalLine, idx: number) => ({
        id: l.id || idx + 1,
        journal_entry_id: l.journalEntryId,
        account_id: l.accountId || null,
        account_name: l.accountName || '',
        chart_account_id: l.chartAccountId || null,
        chart_account_code: l.chartAccountCode || null,
        side: l.side,
        amount: parseFloat(String(l.amount || 0)),
        notes: l.notes || null,
      }));

      const { error: jlErr } = await client
        .from('journal_lines')
        .upsert(linesPayload, { onConflict: 'id' });

      if (jlErr) result.errors.push(`Journal lines migration warning: ${jlErr.message}`);
      else result.insertedCounts.journalLines = linesPayload.length;
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (err: any) {
    result.errors.push(err?.message || 'Unknown migration exception');
    return result;
  }
}

/**
 * Setup Realtime channel subscription for tables in Supabase.
 * Listens for INSERT, UPDATE, DELETE on given tables and executes callback with event data.
 */
export function subscribeToSupabaseRealtime(
  tables: string[],
  onTableChange: (payload: {
    table: string;
    eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    newRecord?: any;
    oldRecord?: any;
  }) => void,
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
) {
  const client = initSupabase();
  if (!client) {
    if (onStatusChange) onStatusChange('CLOSED');
    return null;
  }

  const channelName = `realtime-sync-${Date.now()}`;
  let channel = client.channel(channelName);

  for (const table of tables) {
    channel = channel.on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: table
      },
      (payload: any) => {
        onTableChange({
          table: payload.table || table,
          eventType: payload.eventType,
          newRecord: payload.new,
          oldRecord: payload.old
        });
      }
    );
  }

  channel.subscribe((status: string) => {
    if (onStatusChange) {
      if (status === 'SUBSCRIBED') onStatusChange('SUBSCRIBED');
      else if (status === 'TIMED_OUT') onStatusChange('TIMED_OUT');
      else if (status === 'CLOSED') onStatusChange('CLOSED');
      else if (status === 'CHANNEL_ERROR') onStatusChange('CHANNEL_ERROR');
    }
  });

  return {
    channel,
    unsubscribe: () => {
      try {
        client.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing Supabase realtime channel:', e);
      }
    }
  };
}

/**
 * Returns default Supabase client instance or null.
 */
export const supabase = initSupabase();
