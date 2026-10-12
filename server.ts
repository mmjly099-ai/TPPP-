import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

  // Pull synced data
  app.get('/api/sync/pull', (req, res) => {
    try {
      if (!serverStore && fs.existsSync(SYNC_FILE)) {
        serverStore = JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
      }
      res.json({
        success: true,
        data: serverStore,
        timestamp: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Push synced data
  app.post('/api/sync/push', (req, res) => {
    try {
      const { data } = req.body || {};
      if (data && data.tables) {
        serverStore = data;
        fs.writeFileSync(SYNC_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
      res.json({
        success: true,
        timestamp: Date.now()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
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
