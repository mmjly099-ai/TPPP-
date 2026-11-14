import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  app.use(express.json({ limit: '50mb' }));

  const DATA_DIR = path.resolve(__dirname, 'src/data/tables');
  const SYNC_FILE = path.resolve(DATA_DIR, 'server_synced_data.json');
  const BACKUP_FILE = path.resolve(__dirname, 'src/data/user_backup.json');

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create DATA_DIR', e);
    }
  }

  // Helper to load current master store
  let serverStore: any = null;
  try {
    if (fs.existsSync(SYNC_FILE)) {
      serverStore = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
    } else if (fs.existsSync(BACKUP_FILE)) {
      serverStore = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
      fs.writeFileSync(SYNC_FILE, JSON.stringify(serverStore, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Could not read existing sync file', err);
  }

  // Ensure sw.js and manifest.json are never served stale from browser HTTP cache
  app.use((req, res, next) => {
    if (req.path === '/sw.js' || req.path === '/manifest.json' || req.path === '/manifest.webmanifest') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

  // Auth endpoint
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body || {};
    if (String(password || '').trim().toLowerCase() === 'masnaamasnaa') {
      return res.json({ success: true, token: 'authenticated_masnaamasnaa', timestamp: Date.now() });
    }
    return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  });

  const SUPABASE_CONFIG_FILE = path.resolve(DATA_DIR, 'supabase_config.json');

  app.get('/api/config/supabase', (req, res) => {
    try {
      if (fs.existsSync(SUPABASE_CONFIG_FILE)) {
        const conf = JSON.parse(fs.readFileSync(SUPABASE_CONFIG_FILE, 'utf-8'));
        return res.json({ success: true, url: conf.url || '', anonKey: conf.anonKey || '' });
      }
      return res.json({
        success: true,
        url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
        anonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/config/supabase', (req, res) => {
    try {
      const { url, anonKey } = req.body || {};
      const conf = { url: url || '', anonKey: anonKey || '', updatedAt: new Date().toISOString() };
      fs.writeFileSync(SUPABASE_CONFIG_FILE, JSON.stringify(conf, null, 2), 'utf-8');
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  const DEVICES_FILE = path.resolve(DATA_DIR, 'connected_devices.json');
  let deviceRecords: Record<string, any> = {};

  try {
    if (fs.existsSync(DEVICES_FILE)) {
      deviceRecords = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not read connected_devices.json', e);
  }

  // Server revision tracking & SSE clients for real-time synchronization
  let serverRevision = Date.now();
  const sseClients = new Set<express.Response>();

  const broadcastSyncUpdate = (originDeviceId?: string) => {
    const payload = JSON.stringify({
      type: 'sync_update',
      revision: serverRevision,
      originDeviceId,
      timestamp: Date.now()
    });
    for (const client of sseClients) {
      try {
        client.write(`data: ${payload}\n\n`);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  };

  // Heartbeat to keep mobile and laptop SSE connections alive
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(`: heartbeat ${Date.now()}\n\n`);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  }, 15000);

  // SSE Stream endpoint for instant real-time synchronization across all devices
  app.get('/api/sync/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Initial connection ack
    res.write(`data: ${JSON.stringify({ type: 'connected', revision: serverRevision, timestamp: Date.now() })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Pull synced data
  app.get('/api/sync/pull', (req, res) => {
    try {
      if (fs.existsSync(SYNC_FILE)) {
        serverStore = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
      }

      // Record device heartbeat if headers/query present
      const deviceId = req.query.deviceId as string;
      const deviceName = req.query.deviceName as string;
      const deviceType = req.query.deviceType as string;
      const browser = req.query.browser as string;
      const os = req.query.os as string;

      if (deviceId) {
        deviceRecords[deviceId] = {
          deviceId,
          deviceName: deviceName || deviceRecords[deviceId]?.deviceName || 'جهاز متصل',
          deviceType: deviceType || deviceRecords[deviceId]?.deviceType || 'desktop',
          browser: browser || deviceRecords[deviceId]?.browser || 'متصفح',
          os: os || deviceRecords[deviceId]?.os || 'غير محدد',
          lastSyncAt: new Date().toISOString(),
          lastAction: 'pull',
          recordsCount: serverStore?.tables ? {
            customers: serverStore.tables.customers?.length || 0,
            orders: serverStore.tables.orders?.length || 0,
            expenses: serverStore.tables.expenses?.length || 0,
            journalEntries: serverStore.tables.journalEntries?.length || 0,
          } : undefined
        };
        try {
          fs.writeFileSync(DEVICES_FILE, JSON.stringify(deviceRecords, null, 2), 'utf-8');
        } catch (e) {
          // ignore
        }
      }

      res.json({
        success: true,
        data: serverStore,
        revision: serverRevision,
        timestamp: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Push synced data
  app.post('/api/sync/push', (req, res) => {
    try {
      const { data, device } = req.body || {};
      if (data && data.tables) {
        serverStore = data;
        serverRevision = Date.now();
        fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }

      if (device && device.deviceId) {
        deviceRecords[device.deviceId] = {
          ...device,
          lastSyncAt: new Date().toISOString(),
          lastAction: 'push',
          recordsCount: data?.tables ? {
            customers: data.tables.customers?.length || 0,
            orders: data.tables.orders?.length || 0,
            expenses: data.tables.expenses?.length || 0,
            journalEntries: data.tables.journalEntries?.length || 0,
          } : undefined
        };
        try {
          fs.writeFileSync(DEVICES_FILE, JSON.stringify(deviceRecords, null, 2), 'utf-8');
        } catch (e) {
          // ignore
        }
      }

      // Instantly notify all other connected laptops and phones
      broadcastSyncUpdate(device?.deviceId);

      res.json({
        success: true,
        revision: serverRevision,
        timestamp: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Telemetry endpoint: list all known active syncing devices
  app.get('/api/sync/devices', (req, res) => {
    try {
      if (fs.existsSync(DEVICES_FILE)) {
        deviceRecords = JSON.parse(fs.readFileSync(DEVICES_FILE, 'utf-8'));
      }
      const list = Object.values(deviceRecords).sort((a: any, b: any) => {
        return new Date(b.lastSyncAt).getTime() - new Date(a.lastSyncAt).getTime();
      });
      res.json({
        success: true,
        devices: list,
        serverTime: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Server-Side Smart Assistant Endpoint (Gemini 4 Hydrogen grounded on live verified snapshot)
  app.post('/api/assistant/chat', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return res.status(503).json({
        success: false,
        errorCode: 'MISSING_API_KEY',
        message: 'مفتاح Gemini API غير مضبوط في إعدادات الخادم (Settings > Secrets).'
      });
    }

    try {
      const { message, history, snapshot, queryDetails } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, message: 'يرجى إدخال نص السؤال.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `أنت المحلل المالي والتشغيلي والرقابي الذكي المعتمد لنظام TOP STORE (متجر لوساطة الشراء والتسوق الإلكتروني والشحن من شي إن وعلي إكسبرس في اليمن، العملة الرئيسية: الريال اليمني ر.ي).

قواعد الدقة المطلقة (إلزامي 100%):
1. اعتمد حصرياً على البيانات الحقيقية المحسوبة مسبقاً في (LIVE_STORE_SNAPSHOT) و(QUERY_MATCHED_DETAILS) المرفقة في هذا الطلب.
2. يُمنع منعاً باتاً تخمين أو اختلاق أو تعديل أي رقم أو اسم عميل أو رقم طلب أو حساب. إذا لم تجد معلومة في البيانات المرفقة فاذكر بوضوح أنها غير موجودة في السجلات الحالية.
3. التزم حرفياً بالفروق المحاسبية التالية عند الإجابة:
   - "إجمالي المبيعات": قيمة الطلبات النشطة (غير الملغاة) = salesAndProfit.allTime.totalSales.
   - "مجمل الربح": المبيعات مطروحاً منها تكلفة شراء البضاعة = salesAndProfit.allTime.grossProfit.
   - "صافي الربح المحاسبي": مجمل الربح مطروحاً منه إجمالي المصروفات المعتمدة (التشغيلية + الشحن اللوجستي) = salesAndProfit.allTime.netProfit.
   - "السيولة النقدية الفعلية المتاحة": مجموع أرصدة الحسابات والمحافظ النشطة باستثناء حسابات حقوق الملكية = liquidity.totalCashAndBanks (وهي تختلف عن صافي الربح وتختلف عن ديون العملاء).
   - "ديون العملاء المستحقة لنا (الموجبة)": مجموع الأرصدة الموجبة على العملاء المدينين فقط = customersLedger.totalPositiveCustomerDebts.
   - "الأرصدة الدائنة للعملاء (لهم عندنا)": المبالغ المسددة مقدماً من العملاء = customersLedger.totalNegativeCustomerCredits.
   - "صافي أرصدة العملاء": الموجب ناقص السالب = customersLedger.netCustomerBalances.
   - "إجمالي المصروفات": يشمل المصروفات التشغيلية + مصروفات الشحن اللوجستي المرتبطة بالشحنات = expensesSummary.totalExpensesAllActive.
4. يمكنك تحليل أي قطاع في النظام بشكل شامل: المبيعات والأرباح، السيولة والمحافظ وبطاقات الفيزا، العملاء والذمم، المصروفات وتصنيفاتها وشهورها، الشحنات، دفعات الشراء، الموصلين والعهد والمستحقات، العمال ومصروفاتهم، الذمم الأخرى والسلف، الشركاء ورأس المال، الأقساط، التسويق والحملات، دفتر اليومية والمطابقة المحاسبية، وفحص سلامة النظام.
5. نسق الإجابة باللغة العربية الواضحة والمنظمة بنقاط واضحة، بدون حشو، مع إظهار المعادلات أو التفصيل عند السؤال عن سبب رقم أو كيفية حسابه.
6. في حقل suggestedActions، اختر فقط من معرفات التبويبات الصحيحة:
   dashboard, analytics, orders, installments, couriers, invoices, purchase-batches, marketing, customers, workers, accounts, expenses, shipments, journal, receivables.`;

      const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .filter((h: any) => h && typeof h.text === 'string' && h.text.trim())
            .map((h: any) => ({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: h.text }]
            }))
        : [];

      const groundedTurnPrompt = `سؤال المستخدم: ${message}

=== LIVE_STORE_SNAPSHOT (البيانات الحقيقية المتزامنة لحظياً 100%) ===
${JSON.stringify(snapshot || {})}

=== QUERY_MATCHED_DETAILS (تفاصيل السجلات المطابقة لسؤال المستخدم) ===
${JSON.stringify(queryDetails || {})}`;

      const contents = [
        ...recentHistory,
        {
          role: 'user',
          parts: [{ text: groundedTurnPrompt }]
        }
      ];

      const validTabs = [
        'dashboard',
        'analytics',
        'orders',
        'installments',
        'couriers',
        'invoices',
        'purchase-batches',
        'marketing',
        'customers',
        'workers',
        'accounts',
        'expenses',
        'shipments',
        'journal',
        'receivables'
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'الإجابة العربية الشاملة والدقيقة 100% المبنية حصراً على بيانات النظام المرفقة'
              },
              intent: {
                type: Type.STRING,
                description: 'تصنيف نية السؤال مثل profit_analysis أو customers_ledger أو full_audit'
              },
              summaryMetrics: {
                type: Type.ARRAY,
                description: 'من 0 إلى 4 مؤشرات رقمية مختصرة دقيقة مرتبطة بالسؤال',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    tone: { type: Type.STRING, enum: ['positive', 'warning', 'danger', 'neutral'] }
                  },
                  required: ['label', 'value']
                }
              },
              suggestedActions: {
                type: Type.ARRAY,
                description: 'من 0 إلى 3 أزرار انتقال سريعة لأقسام النظام ذات الصلة',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    targetTab: { type: Type.STRING, enum: validTabs }
                  },
                  required: ['label', 'targetTab']
                }
              }
            },
            required: ['reply', 'intent']
          }
        }
      });

      const rawText = response.text || '';
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText || 'تم تحليل البيانات بنجاح.',
          intent: 'ai_analysis',
          summaryMetrics: [],
          suggestedActions: []
        };
      }

      const toneColorMap: Record<string, string> = {
        positive: 'text-emerald-700',
        warning: 'text-amber-700',
        danger: 'text-rose-700',
        neutral: 'text-slate-800'
      };

      return res.json({
        success: true,
        data: {
          reply: String(parsed.reply || ''),
          intent: String(parsed.intent || 'ai_analysis'),
          summaryMetrics: Array.isArray(parsed.summaryMetrics)
            ? parsed.summaryMetrics.slice(0, 4).map((m: any) => ({
                label: String(m.label || ''),
                value: String(m.value || ''),
                color: toneColorMap[String(m.tone || 'neutral')] || 'text-slate-800'
              }))
            : [],
          suggestedActions: Array.isArray(parsed.suggestedActions)
            ? parsed.suggestedActions
                .filter((a: any) => a && validTabs.includes(a.targetTab))
                .slice(0, 3)
                .map((a: any) => ({ label: String(a.label || 'عرض القسم'), targetTab: String(a.targetTab) }))
            : []
        }
      });
    } catch (err: any) {
      const msg = String(err?.message || err || 'Unknown error');
      const isAuthErr =
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('API_KEY_INVALID') ||
        msg.includes('API key') ||
        err?.status === 403 ||
        err?.status === 401;

      console.error('[Assistant API Error]', msg);
      return res.status(isAuthErr ? 403 : 500).json({
        success: false,
        errorCode: isAuthErr ? 'API_KEY_INVALID' : 'AI_EXECUTION_ERROR',
        message: isAuthErr
          ? 'تعذر التحقق من مفتاح Gemini API. يرجى التأكد من المفتاح في Settings > Secrets.'
          : msg
      });
    }
  });

  // Vite middleware in dev or static files in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
        hmr: false,
        watch: null
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Top Store server running on http://${HOST}:${PORT}`);
  });
}

startServer();
