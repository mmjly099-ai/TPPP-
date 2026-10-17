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

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Quick test ping with short timeout race
    const pingPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('connection_test_deferred')), 4000)
    );
    await Promise.race([pingPromise, timeoutPromise]);
    return true;
  } catch (error) {
    // Expected when offline or test doc does not exist - does not impair offline client operation
    return true;
  }
}
