# Security Specification & Test Matrix

## 1. Data Invariants

1. **User Identity Invariant**: `/users/{userId}` remains strictly isolated (`request.auth.uid == userId` and verified email) to protect PII.
2. **Role Elevation Guard**: Non-admin users cannot elevate their own role to `admin` or change RBAC fields (`role`) arbitrarily.
3. **Password-Session Store Sync Integrity**: After unlocking the application password lock (`masnaamasnaa`), clients obtain a Firebase Auth session (`signInAnonymously`) allowing read/write access strictly to the canonical shared store manifest (`/store_state/main_backup`) and bounded shards (`/store_shards/main_backup_c_*`). All shards verify `existsAfter` on the parent manifest.
4. **Device Telemetry & Audit Isolation**: Connected device records and audit logs enforce `userId == request.auth.uid` on writes and `allow list` queries, preventing unauthorized cross-session scraping.
5. **Audit Log Immutability**: Logs in `/cloud_audit_logs/{logId}` cannot be modified or deleted.
6. **Path Poisoning Guard**: All document IDs conform to `^[a-zA-Z0-9_\-]+$` (<= 128 chars), and shards strictly match `^main_backup_c_[0-9]+$`.
7. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly validated against `request.time`, and `createdAt` is immutable on update.
8. **Default Deny**: Any unmatched document path is rejected by default.

## 2. The "Dirty Dozen" Malicious Payloads

1. **Ghost Field in User**: Payload with `isSuperAdmin: true` injected into UserProfile.
2. **ID Spoofing**: Attempting to write to `/users/other_user_id` with `auth.uid == 'victim'`.
3. **Unauthenticated Read on Store State**: A null auth client trying to read `/store_state/main_backup` or `/store_shards/main_backup_c_0`.
4. **Arbitrary State Document Creation**: Signed-in user trying to write `/store_state/rogue_doc`.
5. **Audit Log Tampering**: Attempting an `update` or `delete` operation on `/cloud_audit_logs/{logId}`.
6. **Path Injection Attack**: Attempting document creation with ID containing `../` or exceeding 128 characters.
7. **Oversized Shard / State Payload**: Write attempting to send `payload` or `dataJson` exceeding 650,000 chars.
8. **Role Escalation on Profile Creation**: Attempting to set `role: 'admin'` directly without bootstrap admin verification.
9. **Fake Timestamp Spoofing**: Attempting to set `createdAt` or `updatedAt` to a client-chosen value instead of `request.time`.
10. **Shadow Key Injection on State/Shard**: Adding unknown key `shadowDatabaseUrl` into `StoreState` or `StoreShard`.
11. **Blanket Query Scraping**: Running an unconstrained `list` query on `/users`, `/store_state`, `/store_shards`, `/connected_devices`, or `/cloud_audit_logs` without `userId == request.auth.uid`.
12. **Orphan Shard / Cross-User Spoofing**: Injecting a `StoreShard` with non-`main_backup` `stateId` or mismatched `userId`.

## 3. Security Rules Test Suite Blueprint

Verification rules ensure each of the above 12 payloads is rejected with `PERMISSION_DENIED`.
