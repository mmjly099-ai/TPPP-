import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleAuthProvider } from './config';
import { handleFirestoreError, OperationType } from './errors';

interface FirebaseContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveStoreToCloud: (stateJson: string, summary?: string) => Promise<boolean>;
  loadStoreFromCloud: () => Promise<string | null>;
  isSyncing: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  currentUser: null,
  loading: true,
  isAdmin: false,
  loginWithGoogle: async () => {},
  logout: async () => {},
  saveStoreToCloud: async () => false,
  loadStoreFromCloud: async () => null,
  isSyncing: false
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const isAdmin = currentUser?.email === 'm1193883q@gmail.com';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Upsert user profile document
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              role: user.email === 'm1193883q@gmail.com' ? 'admin' : 'viewer',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn('Note on user profile sync:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        // Normal user action: popup was dismissed before completing login
        return;
      }
      if (error?.code === 'auth/popup-blocked') {
        throw new Error('تم حظر النافذة المنبثقة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.');
      }
      if (error?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
        throw new Error(`النطاق (${domain}) يحتاج للإضافة في قائمة النطاقات المصرحة (Authorized Domains) في Firebase Console. علماً بأن النظام متزامن ومحمي بالفعل عبر السيرفر لكافة الهواتف واللابتوبات دون الحاجة لحساب Google.`);
      }
      console.warn('Google Sign-In note:', error?.message || error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-Out failed:', error);
      throw error;
    }
  };

  const saveStoreToCloud = async (stateJson: string, summary: string = 'تحديث المزامنة السحابية'): Promise<boolean> => {
    if (!currentUser) return false;
    setIsSyncing(true);
    const path = 'store_state/main_backup';
    try {
      const stateRef = doc(db, 'store_state', 'main_backup');
      await setDoc(stateRef, {
        id: 'main_backup',
        userId: currentUser.uid,
        version: '1.0.0',
        dataJson: stateJson,
        summary: summary.slice(0, 500),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Record audit log
      try {
        const logId = `log_${Date.now()}`;
        await setDoc(doc(db, 'cloud_audit_logs', logId), {
          id: logId,
          userId: currentUser.uid,
          action: 'cloud_backup',
          entityType: 'store_state',
          details: `مزامنة سحابية لقاعدة بيانات TOP STORE بواسطة ${currentUser.displayName || currentUser.email}`,
          createdAt: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn('Audit log write error:', logErr);
      }

      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadStoreFromCloud = async (): Promise<string | null> => {
    if (!currentUser) return null;
    setIsSyncing(true);
    const path = 'store_state/main_backup';
    try {
      const stateRef = doc(db, 'store_state', 'main_backup');
      const snap = await getDoc(stateRef);
      if (snap.exists()) {
        const data = snap.data();
        return data.dataJson || null;
      }
      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        loading,
        isAdmin,
        loginWithGoogle,
        logout,
        saveStoreToCloud,
        loadStoreFromCloud,
        isSyncing
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};
