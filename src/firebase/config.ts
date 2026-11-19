import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Use initializeFirestore with auto-detect long polling for reliable connectivity in web iframes/proxies
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

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
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const pingPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('connection_timeout')), 5000)
    );
    await Promise.race([pingPromise, timeoutPromise]);
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

    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return {
        ok: false,
        online: false,
        latencyMs,
        message: 'العميل غير متصل بالإنترنت أو تعذر الوصول إلى خادم Firebase Firestore'
      };
    }

    if (msg.includes('connection_timeout')) {
      return {
        ok: false,
        online: false,
        latencyMs,
        message: 'انتهت مهلة الاتصال بخادم Firestore'
      };
    }

    // Server responded (e.g., permission-denied on test/connection probe means Firestore endpoint is live & reachable)
    if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
      return {
        ok: true,
        online: true,
        latencyMs,
        message: 'خادم Cloud Firestore متاح ونشط (تم التحقق من الاتصال)'
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
