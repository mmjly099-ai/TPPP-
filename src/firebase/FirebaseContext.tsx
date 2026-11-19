import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInAnonymously,
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
  where,
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db, testFirestoreConnection, FirestoreConnectionCheckResult } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { getOrCreateCurrentDevice, DeviceSyncRecord } from '../utils/deviceTracker';

const CHUNK_CHAR_SIZE = 250_000; // ~250k chars (~500KB UTF-8 worst-case) safely below 1 MiB Firestore doc limit

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
  isSyncing: boolean;
  lastCloudSyncAt: string | null;
  cloudRevision: number | null;
  chunkInfo: CloudChunkInfo | null;
  firebaseRealtimeStatus: 'connected' | 'disconnected' | 'idle';
  authError: string | null;
  anonymousProviderDisabled: boolean;
  connectCloudWithPasswordSession: () => Promise<boolean>;
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
  isSyncing: false,
  lastCloudSyncAt: null,
  cloudRevision: null,
  chunkInfo: null,
  firebaseRealtimeStatus: 'idle',
  authError: null,
  anonymousProviderDisabled: false,
  connectCloudWithPasswordSession: async () => false,
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
  const [anonymousProviderDisabled, setAnonymousProviderDisabled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        setAuthError(null);
        setAnonymousProviderDisabled(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const connectCloudWithPasswordSession = useCallback(async (): Promise<boolean> => {
    setAuthError(null);
    if (auth.currentUser) {
      setAnonymousProviderDisabled(false);
      return true;
    }
    try {
      await signInAnonymously(auth);
      setAnonymousProviderDisabled(false);
      return true;
    } catch (error: any) {
      const code = String(error?.code || '');
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/admin-restricted-operation'
      ) {
        setAnonymousProviderDisabled(true);
        setAuthError(
          'يرجى تفعيل خيار "Anonymous" (المصادقة السحابية بدون بريد) مرة واحدة فقط من إعدادات Firebase Authentication لتشغيل المزامنة التلقائية لكافة الأجهزة.'
        );
        return false;
      }
      setAuthError(error?.message || 'تعذر بدء جلسة المزامنة السحابية');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setFirebaseRealtimeStatus('idle');
    } catch (error) {
      console.error('Sign-Out failed:', error);
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
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) return false;
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
        const msg = readErr instanceof Error ? readErr.message : String(readErr);
        if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied')) {
          handleFirestoreError(readErr, OperationType.GET, statePath);
        }
      }

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

      const deviceRef = doc(db, 'connected_devices', deviceId);
      let deviceExists = false;
      try {
        const devSnap = await getDoc(deviceRef);
        deviceExists = devSnap.exists();
      } catch {
        deviceExists = false;
      }

      const firstBatch = writeBatch(db);

      const manifestMutable = {
        userId: activeUser.uid,
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

      const firstBatchShardCount = Math.min(chunks.length, 8);
      for (let i = 0; i < firstBatchShardCount; i++) {
        const shardId = `main_backup_c_${i}`;
        const shardRef = doc(db, 'store_shards', shardId);
        const shardMutable = {
          userId: activeUser.uid,
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
        userId: activeUser.uid,
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
        userId: activeUser.uid,
        action: 'cloud_backup',
        entityType: 'store_state',
        details: `${summary.slice(0, 200)} (${chunks.length} أجزاء / ${(totalChars / 1024).toFixed(0)} KB)`.slice(0, 1000),
        createdAt: serverTimestamp()
      });

      await firstBatch.commit();

      for (let start = 8; start < chunks.length; start += 8) {
        const extraBatch = writeBatch(db);
        const end = Math.min(start + 8, chunks.length);
        for (let i = start; i < end; i++) {
          const shardId = `main_backup_c_${i}`;
          const shardRef = doc(db, 'store_shards', shardId);
          const shardMutable = {
            userId: activeUser.uid,
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
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) return null;
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
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) {
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
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) return [];
    const colPath = 'connected_devices';
    try {
      const colRef = collection(db, colPath);
      const q = query(colRef, where('userId', '==', activeUser.uid));
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
  }, [currentUser]);

  const getRecentCloudAuditLogs = useCallback(async (): Promise<CloudAuditEntry[]> => {
    const activeUser = auth.currentUser || currentUser;
    if (!activeUser) return [];
    const colPath = 'cloud_audit_logs';
    try {
      const colRef = collection(db, colPath);
      const q = query(colRef, where('userId', '==', activeUser.uid), orderBy('createdAt', 'desc'), limit(20));
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
  }, [currentUser]);

  return (
    <FirebaseContext.Provider
      value={{
        currentUser,
        loading,
        isSyncing,
        lastCloudSyncAt,
        cloudRevision,
        chunkInfo,
        firebaseRealtimeStatus,
        authError,
        anonymousProviderDisabled,
        connectCloudWithPasswordSession,
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
