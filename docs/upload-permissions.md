# Dataset upload permissions

Dataset upload authorization is owned and enforced by GeoNode. Mirante does not introduce a separate role, permission store, or authorization backend.

## GeoNode contract

GeoNode 5.1.0 protects `POST /api/v2/uploads/upload` with the Django model permission `base.add_resourcebase`. The authenticated API V2 user representation exposes this capability through its compact `perms` list as `add_resource`.

Mirante maps `add_resource` to the `canUploadDatasets` user capability. The upload action is rendered only when both conditions are true:

- Dataset upload is enabled in the public Mirante configuration.
- The authenticated GeoNode user has `add_resource` in the API response.

The server remains authoritative. Mirante handles an upload `403 Forbidden` as a permission denial even if the permission was removed after the session was restored.

## Assigning access

Administrators should assign `base.add_resourcebase` to an appropriate user or group through GeoNode administration. GeoNode's standard Contributors group receives this permission in the vanilla installation, and newly registered users are added to that group by default. Deployments that must restrict upload to a smaller audience should adjust the Contributors group or the default registration policy in GeoNode. Group-derived permissions are included in the user's compact API permission list.

Avoid using administrator status as the upload check. A regular user may upload when the permission is granted, and an authenticated user without it must not receive upload access.

## Current limits

- Permission changes are reflected after the user signs in again or reloads Mirante and restores the session.
- Mirante does not provide a permission administration interface; administrators manage users and groups in GeoNode.
