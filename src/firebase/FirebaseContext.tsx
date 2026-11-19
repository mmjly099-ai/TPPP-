import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, testFirestoreConnection, FirestoreConnectionCheckResult } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { getOrCreateCurrentDevice, DeviceSyncRecord } from '../utils/deviceTracker';

const CHUNK_CHAR_SIZE = 250_000; // ~250k chars (~500KB UTF-8 worst-case) safely below 1 MiB Firestore doc limit
const BOOTSTRAP_ADMIN_EMAIL = 'm1193883q@gmail.com';

export interface CloudChunkInfo {
  storageMode: 'chunked_v2' | 'inline_v1';
  chunkCount: number;
  totalChars: number;
  revision: number;
  originDeviceId?: string;
  updatedAtIso?: string;
}

export interface CloudStoreLoadResult {
  dataJson: string;
  revision: number;
  originDeviceId?: string;
  updatedAtIso?: string;
  chunkCount: number;
}

export interface CloudAuditEntry {
  id: string;
  userId: string;
  action: string;
  entityType?: string;
  details: string;
  createdAtIso: string;
}

export interface CloudSaveCounts {
  customersCount?: number;
  ordersCount?: number;
  expensesCount?: number;
  journalEntriesCount?: number;
}

interface FirebaseContextType {
  currentUser: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSyncing: boolean;
  lastCloudSyncAt: string | null;
  cloudRevision: number | null;
  chunkInfo: CloudChunkInfo | null;
  firebaseRealtimeStatus: 'connected' | 'disconnected' | 'idle';
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  testConnectionNow: () => Promise<FirestoreConnectionCheckResult>;
  saveStoreToCloud: (
    stateJson: string,
    summary?: string,
    counts?: CloudSaveCounts,
    originDeviceId?: string
  ) => Promise<boolean>;
  loadStoreFromCloud: () => Promise<CloudStoreLoadResult | null>;
  subscribeToCloudStore: (
    onRemoteManifest: (manifest: { revision: number; originDeviceId?: string; updatedAtIso?: string }) => void
  ) => () => void;
  getConnectedCloudDevices: () => Promise<DeviceSyncRecord[]>;
  getRecentCloudAuditLogs: () => Promise<CloudAuditEntry[]>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  currentUser: null,
  loading: true,
  isAdmin: false,
  isSyncing: false,
  lastCloudSyncAt: null,
  cloudRevision: null,
  chunkInfo: null,
  firebaseRealtimeStatus: 'idle',
  authError: null,
  loginWithGoogle: async () => {},
  logout: async () => {},
  testConnectionNow: async () => ({ ok: false, online: false, latencyMs: 0, message: '' }),
  saveStoreToCloud: async () => false,
  loadStoreFromCloud: async () => null,
  subscribeToCloudStore: () => () => {},
  getConnectedCloudDevices: async () => [],
  getRecentCloudAuditLogs: async () => []
});

export const useFirebase = () => useContext(FirebaseContext);

function toIsoDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return '';
    }
  }
  return '';
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<string | null>(null);
  const [cloudRevision, setCloudRevision] = useState<number | null>(null);
  const [chunkInfo, setChunkInfo] = useState<CloudChunkInfo | null>(null);
  const [firebaseRealtimeStatus, setFirebaseRealtimeStatus] = useState<'connected' | 'disconnected' | 'idle'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = currentUser?.email === BOOTSTRAP_ADMIN_EMAIL && !!currentUser?.emailVerified;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      setAuthError(null);

      if (user && user.emailVerified) {
        const userPath = `users/${user.uid}`;
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              email: user.email || '',
              displayName: (user.displayName || '').slice(0, 128),
              photoURL: (user.photoURL || '').slice(0, 1024),
              role: user.email === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : 'viewer',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            await updateDoc(userRef, {
              displayName: (user.displayName || '').slice(0, 128),
              photoURL: (user.photoURL || '').slice(0, 1024),
              updatedAt: serverTimestamp()
            });
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, userPath);
          } catch (formattedErr) {
            console.warn('User profile sync notice:', formattedErr);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      if (error?.code === 'auth/popup-blocked') {
        const msg = 'تم حظر النافذة المنبثقة بواسطة المتصفح. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.';
        setAuthError(msg);
        throw new Error(msg);
      }
      if (error?.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
        const msg = `auth/unauthorized-domain: النطاق (${domain}) يحتاج للإضافة في قائمة Authorized Domains في Firebase Console.`;
        setAuthError(msg);
        throw error;
      }
      setAuthError(error?.message || 'فشل تسجيل الدخول عبر Google');
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setFirebaseRealtimeStatus('idle');
    } catch (error) {
      console.error('Sign-Out failed:', error);
      throw error;
    }
  }, []);

  const testConnectionNow = useCallback(async () => {
    return await testFirestoreConnection();
  }, []);

  const saveStoreToCloud = useCallback(async (
    stateJson: string,
    summary: string = 'تحديث المزامنة السحابية',
    counts?: CloudSaveCounts,
    originDeviceId?: string
  ): Promise<boolean> => {
    if (!currentUser || !currentUser.emailVerified) return false;
    setIsSyncing(true);
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const statePath = 'store_state/main_backup';

    try {
      const currentDev = getOrCreateCurrentDevice();
      const deviceId = (originDeviceId || currentDev.deviceId).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
      const revision = Date.now();
      const totalChars = stateJson.length;

      // Split into ~250k char shards so each Firestore doc remains well below 1 MiB
      const chunks: string[] = [];
      for (let i = 0; i < totalChars; i += CHUNK_CHAR_SIZE) {
        chunks.push(stateJson.slice(i, i + CHUNK_CHAR_SIZE));
      }
      if (chunks.length === 0) {
        chunks.push('{}');
      }

      const stateRef = doc(db, 'store_state', 'main_backup');
      let existingChunkCount = 0;
      let stateExists = false;

      try {
        const existingStateSnap = await getDoc(stateRef);
        stateExists = existingStateSnap.exists();
        if (stateExists) {
          existingChunkCount = Number(existingStateSnap.data()?.chunkCount || 0);
        }
      } catch (readErr) {
        // Ignore missing doc read errors when initializing for the first time, handle real permission failures
        const msg = readErr instanceof Error ? readErr.message : String(readErr);
        if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
          handleFirestoreError(readErr, OperationType.GET, statePath);
        }
      }

      // Check which shard docs already exist so we strictly honor createdAt immutability on update vs create
      const shardExistsFlags = await Promise.all(
        chunks.map(async (_, idx) => {
          const shardId = `main_backup_c_${idx}`;
          try {
            const snap = await getDoc(doc(db, 'store_shards', shardId));
            return snap.exists();
          } catch {
            return false;
          }
        })
      );

      // Check connected device existence
      const deviceRef = doc(db, 'connected_devices', deviceId);
      let deviceExists = false;
      try {
        const devSnap = await getDoc(deviceRef);
        deviceExists = devSnap.exists();
      } catch {
        deviceExists = false;
      }

      // Commit manifest + shards + device telemetry + audit log atomically
      // Use chunked batches if there are many shards to stay well under Firestore 10 MiB batch limit
      const firstBatch = writeBatch(db);

      const manifestMutable = {
        userId: currentUser.uid,
        version: '2.0.0',
        storageMode: 'chunked_v2',
        chunkCount: chunks.length,
        totalChars,
        revision,
        originDeviceId: deviceId,
        dataJson: '',
        summary: summary.slice(0, 500),
        updatedAt: serverTimestamp()
      };

      if (stateExists) {
        firstBatch.update(stateRef, manifestMutable);
      } else {
        firstBatch.set(stateRef, {
          id: 'main_backup',
          ...manifestMutable,
          createdAt: serverTimestamp()
        });
      }

      // Put up to 8 shards in the first atomic batch (max ~4MB)
      const firstBatchShardCount = Math.min(chunks.length, 8);
      for (let i = 0; i < firstBatchShardCount; i++) {
        const shardId = `main_backup_c_${i}`;
        const shardRef = doc(db, 'store_shards', shardId);
        const shardMutable = {
          userId: currentUser.uid,
          shardIndex: i,
          chunkCount: chunks.length,
          revision,
          payload: chunks[i],
          updatedAt: serverTimestamp()
        };

        if (shardExistsFlags[i]) {
          firstBatch.update(shardRef, shardMutable);
        } else {
          firstBatch.set(shardRef, {
            id: shardId,
            stateId: 'main_backup',
            ...shardMutable,
            createdAt: serverTimestamp()
          });
        }
      }

      const latencyMs = Math.max(1, Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0));
      const nowIso = new Date().toISOString();

      const deviceMutable = {
        userId: currentUser.uid,
        deviceName: currentDev.deviceName.slice(0, 128),
        deviceType: currentDev.deviceType,
        browser: currentDev.browser.slice(0, 128),
        os: currentDev.os.slice(0, 128),
        syncType: 'firebase_push' as const,
        syncStatus: 'success' as const,
        customersCount: counts?.customersCount ?? 0,
        ordersCount: counts?.ordersCount ?? 0,
        expensesCount: counts?.expensesCount ?? 0,
        journalEntriesCount: counts?.journalEntriesCount ?? 0,
        latencyMs,
        lastSyncIso: nowIso,
        updatedAt: serverTimestamp()
      };

      if (deviceExists) {
        firstBatch.update(deviceRef, deviceMutable);
      } else {
        firstBatch.set(deviceRef, {
          deviceId,
          ...deviceMutable,
          createdAt: serverTimestamp()
        });
      }

      const logId = `log_${revision}`;
      firstBatch.set(doc(db, 'cloud_audit_logs', logId), {
        id: logId,
        userId: currentUser.uid,
        action: 'cloud_backup',
        entityType: 'store_state',
        details: `${summary.slice(0, 200)} (${chunks.length} أجزاء / ${(totalChars / 1024).toFixed(0)} KB)`.slice(0, 1000),
        createdAt: serverTimestamp()
      });

      await firstBatch.commit();

      // Commit remaining shards (if store ever exceeds 2 MB) & delete stale tail shards
      for (let start = 8; start < chunks.length; start += 8) {
        const extraBatch = writeBatch(db);
        const end = Math.min(start + 8, chunks.length);
        for (let i = start; i < end; i++) {
          const shardId = `main_backup_c_${i}`;
          const shardRef = doc(db, 'store_shards', shardId);
          const shardMutable = {
            userId: currentUser.uid,
            shardIndex: i,
            chunkCount: chunks.length,
            revision,
            payload: chunks[i],
            updatedAt: serverTimestamp()
          };
          if (shardExistsFlags[i]) {
            extraBatch.update(shardRef, shardMutable);
          } else {
            extraBatch.set(shardRef, {
              id: shardId,
              stateId: 'main_backup',
              ...shardMutable,
              createdAt: serverTimestamp()
            });
          }
        }
        await extraBatch.commit();
      }

      if (existingChunkCount > chunks.length) {
        const cleanupBatch = writeBatch(db);
        for (let i = chunks.length; i < existingChunkCount; i++) {
          cleanupBatch.delete(doc(db, 'store_shards', `main_backup_c_${i}`));
        }
        await cleanupBatch.commit();
      }

      setCloudRevision(revision);
      setLastCloudSyncAt(new Date().toLocaleTimeString('ar-YE'));
      setChunkInfo({
        storageMode: 'chunked_v2',
        chunkCount: chunks.length,
        totalChars,
        revision,
        originDeviceId: deviceId,
        updatedAtIso: nowIso
      });
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, statePath);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  const loadStoreFromCloud = useCallback(async (): Promise<CloudStoreLoadResult | null> => {
    if (!currentUser || !currentUser.emailVerified) return null;
    setIsSyncing(true);
    const statePath = 'store_state/main_backup';
    try {
      const stateRef = doc(db, 'store_state', 'main_backup');
      const snap = await getDoc(stateRef);
      if (!snap.exists()) {
        return null;
      }

      const data = snap.data();
      const updatedAtIso = toIsoDate(data.updatedAt);
      const revision = Number(data.revision || 0);
      const originDeviceId = data.originDeviceId as string | undefined;

      if (data.storageMode === 'chunked_v2' && Number(data.chunkCount || 0) > 0) {
        const count = Number(data.chunkCount);
        const shardPayloads = await Promise.all(
          Array.from({ length: count }, async (_, idx) => {
            const shardId = `main_backup_c_${idx}`;
            const shardPath = `store_shards/${shardId}`;
            try {
              const shardSnap = await getDoc(doc(db, 'store_shards', shardId));
              if (!shardSnap.exists()) {
                throw new Error(`Missing shard ${shardId}`);
              }
              return String(shardSnap.data()?.payload || '');
            } catch (shardErr) {
              handleFirestoreError(shardErr, OperationType.GET, shardPath);
            }
          })
        );

        const joined = shardPayloads.join('');
        setCloudRevision(revision);
        setLastCloudSyncAt(new Date().toLocaleTimeString('ar-YE'));
        setChunkInfo({
          storageMode: 'chunked_v2',
          chunkCount: count,
          totalChars: joined.length,
          revision,
          originDeviceId,
          updatedAtIso
        });

        return {
          dataJson: joined,
          revision,
          originDeviceId,
          updatedAtIso,
          chunkCount: count
        };
      }

      if (typeof data.dataJson === 'string' && data.dataJson.length > 0) {
        setCloudRevision(revision);
        setLastCloudSyncAt(new Date().toLocaleTimeString('ar-YE'));
        setChunkInfo({
          storageMode: 'inline_v1',
          chunkCount: 1,
          totalChars: data.dataJson.length,
          revision,
          originDeviceId,
          updatedAtIso
        });
        return {
          dataJson: data.dataJson,
          revision,
          originDeviceId,
          updatedAtIso,
          chunkCount: 1
        };
      }

      return null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, statePath);
    } finally {
      setIsSyncing(false);
    }
  }, [currentUser]);

  const subscribeToCloudStore = useCallback((
    onRemoteManifest: (manifest: { revision: number; originDeviceId?: string; updatedAtIso?: string }) => void
  ): (() => void) => {
    if (!currentUser || !currentUser.emailVerified) {
      setFirebaseRealtimeStatus('idle');
      return () => {};
    }

    const statePath = 'store_state/main_backup';
    const stateRef = doc(db, 'store_state', 'main_backup');

    const unsub = onSnapshot(
      stateRef,
      (snap) => {
        setFirebaseRealtimeStatus('connected');
        if (!snap.exists()) return;
        const data = snap.data();
        const revision = Number(data.revision || 0);
        const originDeviceId = data.originDeviceId as string | undefined;
        const updatedAtIso = toIsoDate(data.updatedAt);

        setCloudRevision(revision);
        setChunkInfo({
          storageMode: data.storageMode === 'chunked_v2' ? 'chunked_v2' : 'inline_v1',
          chunkCount: Number(data.chunkCount || 0),
          totalChars: Number(data.totalChars || 0),
          revision,
          originDeviceId,
          updatedAtIso
        });

        onRemoteManifest({ revision, originDeviceId, updatedAtIso });
      },
      (error) => {
        setFirebaseRealtimeStatus('disconnected');
        try {
          handleFirestoreError(error, OperationType.GET, statePath);
        } catch (formatted) {
          console.warn('Firestore realtime subscription notice:', formatted);
        }
      }
    );

    return () => {
      unsub();
      setFirebaseRealtimeStatus('idle');
    };
  }, [currentUser]);

  const getConnectedCloudDevices = useCallback(async (): Promise<DeviceSyncRecord[]> => {
    if (!currentUser || !currentUser.emailVerified) return [];
    const colPath = 'connected_devices';
    try {
      const colRef = collection(db, colPath);
      const q = isAdmin
        ? query(colRef)
        : query(colRef, where('userId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const list: DeviceSyncRecord[] = [];
      snap.forEach((d) => {
        const v = d.data();
        list.push({
          deviceId: v.deviceId,
          deviceName: v.deviceName,
          deviceType: v.deviceType || 'desktop',
          browser: v.browser || '',
          os: v.os || '',
          lastSyncAt: v.lastSyncIso || toIsoDate(v.updatedAt),
          syncType: v.syncType || 'firebase_push',
          syncStatus: v.syncStatus || 'success',
          recordsCount: {
            customers: Number(v.customersCount || 0),
            orders: Number(v.ordersCount || 0),
            expenses: Number(v.expensesCount || 0),
            journalEntries: Number(v.journalEntriesCount || 0)
          },
          latencyMs: typeof v.latencyMs === 'number' ? v.latencyMs : undefined
        });
      });
      return list.sort((a, b) => new Date(b.lastSyncAt || 0).getTime() - new Date(a.lastSyncAt || 0).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  }, [currentUser, isAdmin]);

  const getRecentCloudAuditLogs = useCallback(async (): Promise<CloudAuditEntry[]> => {
    if (!currentUser || !currentUser.emailVerified) return [];
    const colPath = 'cloud_audit_logs';
    try {
      const colRef = collection(db, colPath);
      const q = isAdmin
        ? query(colRef, orderBy('createdAt', 'desc'), limit(20))
        : query(colRef, where('userId', '==', currentUser.uid), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      const logs: CloudAuditEntry[] = [];
      snap.forEach((d) => {
        const v = d.data();
        logs.push({
          id: v.id,
          userId: v.userId,
          action: v.action,
          entityType: v.entityType,
          details: v.details,
          createdAtIso: toIsoDate(v.createdAt)
        });
      });
      return logs;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }
  }, [currentUser, isAdmin]);

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        loading,
        isAdmin,
        isSyncing,
        lastCloudSyncAt,
        cloudRevision,
        chunkInfo,
        firebaseRealtimeStatus,
        authError,
        loginWithGoogle,
        logout,
        testConnectionNow,
        saveStoreToCloud,
        loadStoreFromCloud,
        subscribeToCloudStore,
        getConnectedCloudDevices,
        getRecentCloudAuditLogs
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};
