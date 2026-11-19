import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Force HTTP long-polling to avoid WebChannel streaming stalls behind proxies, VPNs, or iframes
export const db = initializeFirestore(
  app,
  {
    ...(typeof window !== 'undefined' ? { experimentalForceLongPolling: true } : {}),
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);

export const firebaseProjectMeta = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
};

export interface FirestoreConnectionCheckResult {
  ok: boolean;
  online: boolean;
  latencyMs: number;
  message: string;
}

export async function testFirestoreConnection(): Promise<FirestoreConnectionCheckResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      online: false,
      latencyMs: 0,
      message: 'المتصفح في وضع عدم الاتصال بالإنترنت حالياً'
    };
  }

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const latencyMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    return {
      ok: true,
      online: true,
      latencyMs,
      message: 'متصل بخادم Cloud Firestore بنجاح'
    };
  } catch (error: any) {
    const latencyMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    const msg = error instanceof Error ? error.message : String(error);
    const code = error?.code ? String(error.code) : '';

    // Server responded with permission-denied -> Firestore backend is online and reachable
    if (
      code === 'permission-denied' ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('permission-denied')
    ) {
      return {
        ok: true,
        online: true,
        latencyMs,
        message: 'خادم Cloud Firestore متاح ونشط (تم التحقق من الاتصال)'
      };
    }

    if (msg.includes('the client is offline')) {
      console.warn('Firestore startup check: client is currently offline.');
      return {
        ok: false,
        online: false,
        latencyMs,
        message: 'العميل غير متصل بالإنترنت أو تعذر الوصول إلى خادم Firebase Firestore'
      };
    }

    return {
      ok: false,
      online: false,
      latencyMs,
      message: msg || 'تعذر التحقق من اتصال Firestore'
    };
  }
}

// Mandatory startup connection probe
void testFirestoreConnection();
