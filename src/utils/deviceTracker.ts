/**
 * Device Fingerprinting & Sync Telemetry Utility
 * Generates and stores consistent device identity across sessions.
 */

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution: string;
}

export interface DeviceSyncRecord {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip?: string;
  lastSyncAt: string; // ISO string
  syncType: 'pull' | 'push' | 'supabase_push' | 'supabase_pull';
  syncStatus: 'success' | 'failed' | 'pending';
  recordsCount?: {
    customers: number;
    orders: number;
    expenses: number;
    journalEntries: number;
  };
  latencyMs?: number;
}

const DEVICE_STORAGE_KEY = 'topstore_device_profile_v1';

export function getOrCreateCurrentDevice(): DeviceInfo {
  try {
    const cached = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // ignore
  }

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /(iPad|Tablet|(Android(?!.*Mobile)))/i.test(userAgent);

  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  // Detect OS
  let os = 'غير محدد';
  if (/Windows/i.test(userAgent)) os = 'ويندوز (Windows)';
  else if (/Macintosh|Mac OS/i.test(userAgent)) os = 'ماك (macOS)';
  else if (/iPhone|iPad/i.test(userAgent)) os = 'آيفون / آيباد (iOS)';
  else if (/Android/i.test(userAgent)) os = 'أندرويد (Android)';
  else if (/Linux/i.test(userAgent)) os = 'لينكس (Linux)';

  // Detect Browser
  let browser = 'المتصفح';
  if (/Chrome|CriOS/i.test(userAgent) && !/Edg|OPR/i.test(userAgent)) browser = 'جوجل كروم (Chrome)';
  else if (/Safari/i.test(userAgent) && !/Chrome|CriOS|Edg|OPR/i.test(userAgent)) browser = 'سفاري (Safari)';
  else if (/Edg/i.test(userAgent)) browser = 'مايكروسوفت إيدج (Edge)';
  else if (/Firefox|FxiOS/i.test(userAgent)) browser = 'فايرفوكس (Firefox)';

  // Build friendly name
  const randSuffix = Math.floor(100 + Math.random() * 900);
  const deviceName = `${deviceType === 'desktop' ? 'لابتوب / كمبيوتر' : deviceType === 'tablet' ? 'جهاز لوحي (تابلت)' : 'هاتف جوال'} (${os.split(' ')[0]}) - #${randSuffix}`;

  const deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const info: DeviceInfo = {
    deviceId,
    deviceName,
    deviceType,
    browser,
    os,
    screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '1920x1080'
  };

  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(info));
  } catch (e) {
    // ignore
  }

  return info;
}
