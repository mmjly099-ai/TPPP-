# Security Specification & Test Matrix

## 1. Data Invariants

1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created or modified if `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Role Elevation Guard**: Non-admin users cannot elevate their own role to `admin` or change RBAC fields (`role`) arbitrarily.
3. **Store State & Shard Integrity**: Only verified authenticated users (`email_verified == true`) with store operator/admin authorization or ownership can read or write `/store_state/{stateId}` and `/store_shards/{shardId}`. Every shard references a valid parent `stateId` that exists in the same atomic write batch (`existsAfter`).
4. **Device Telemetry Isolation**: Connected device records in `/connected_devices/{deviceId}` enforce `userId == request.auth.uid` on write and prevent list scraping across unrelated accounts.
5. **Audit Log Immutability**: Logs in `/cloud_audit_logs/{logId}` can only be created by verified authenticated users with matching `userId`, stamped with `request.time`, and cannot be updated or deleted.
6. **Path Poisoning Guard**: All document IDs must conform to `^[a-zA-Z0-9_\-]+$` and be <= 128 chars.
7. **Temporal Integrity**: `createdAt` and `updatedAt` are strictly validated against `request.time`, and `createdAt` is immutable on update.
8. **Default Deny**: Any unmatched document path is rejected by default.

## 2. The "Dirty Dozen" Malicious Payloads

1. **Ghost Field in User**: Payload with `isSuperAdmin: true` injected into UserProfile.
2. **ID Spoofing**: Attempting to write to `/users/other_user_id` with `auth.uid == 'victim'`.
3. **Unauthenticated Read on Store State**: An anonymous/null auth trying to read `/store_state/main_backup` or `/store_shards/main_backup_c_0`.
4. **Store State Overwrite by Unverified Email**: User with `email_verified == false` attempting to overwrite store state.
5. **Audit Log Tampering**: Attempting an `update` or `delete` operation on `/cloud_audit_logs/{logId}`.
6. **Path Injection Attack**: Attempting document creation with ID containing `../` or exceeding 128 characters.
7. **Oversized Shard / State Payload**: Write attempting to send `payload` or `dataJson` exceeding 650,000 bytes/chars.
8. **Role Escalation on Profile Creation**: New user attempting to set `role: 'admin'` directly without bootstrap admin verification.
9. **Fake Timestamp Spoofing**: Attempting to set `createdAt` or `updatedAt` to a client-chosen future or past value instead of `request.time`.
10. **Shadow Key Injection on State/Shard**: Adding unknown key `shadowDatabaseUrl` into `StoreState` or `StoreShard`.
11. **Blanket Query Scraping**: Malicious client running an unconstrained `list` query on `/users`, `/store_shards`, `/connected_devices`, or `/cloud_audit_logs` without owner/admin scoping.
12. **Orphan Shard / Cross-Tenant Injection**: User injecting a `StoreShard` pointing to a non-existent `stateId` or with `userId` belonging to another user.

## 3. Security Rules Test Suite Blueprint

Verification rules ensure each of the above 12 payloads is rejected with `PERMISSION_DENIED`.
