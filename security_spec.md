# Security Specification & Test Matrix

## 1. Data Invariants

1. **User Identity Invariant**: A user document at `/users/{userId}` can only be created or modified if `request.auth.uid == userId`.
2. **Role Elevation Guard**: Non-admin users cannot elevate their own role to `admin` or change RBAC fields arbitrarily.
3. **Store State Integrity**: Only authenticated users with verified email can sync or read `/store_state/{stateId}`.
4. **Audit Log Immutability**: Logs in `/cloud_audit_logs/{logId}` can only be created by authenticated users and cannot be modified or deleted.
5. **Path Poisoning Guard**: All document IDs must conform to `^[a-zA-Z0-9_\-]+$` and be <= 128 chars.
6. **Default Deny**: Any unmatched document path is rejected by default.

## 2. The "Dirty Dozen" Malicious Payloads

1. **Ghost Field in User**: Payload with `isSuperAdmin: true` injected into UserProfile.
2. **ID Spoofing**: Attempting to write to `/users/other_user_id` with `auth.uid == 'victim'`.
3. **Unauthenticated Read on Store State**: An anonymous/null auth trying to read `/store_state/main_backup`.
4. **Store State Overwrite by Unverified Email**: User with `email_verified == false` attempting to overwrite store state.
5. **Audit Log Tampering**: Attempting an `update` or `delete` operation on `/cloud_audit_logs/{logId}`.
6. **Path Injection Attack**: Attempting document creation with ID containing `../` or exceeding 128 characters.
7. **Oversized State Payload**: State update attempting to send `dataJson` exceeding the allowed size boundary.
8. **Role Escalation on Profile Creation**: New user attempting to set `role: 'admin'` directly without admin privileges.
9. **Fake Timestamp Spoofing**: Attempting to set `createdAt` or `updatedAt` to a future or past date instead of server time.
10. **Shadow Key Injection on State**: Adding unknown key `shadowDatabaseUrl` into `StoreState`.
11. **Blanket Query Scraping**: Malicious client running an unconstrained query without user context.
12. **Cross-Tenant Audit Injection**: User injecting an audit log with `userId` of another admin.

## 3. Security Rules Test Suite Blueprint

Verification rules ensure each of the above 12 payloads is rejected with `PERMISSION_DENIED`.
