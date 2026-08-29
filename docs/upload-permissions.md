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

## Visibility of a new dataset

When `datasetUploadVisibilityControl` is enabled, the upload dialog provides
three optional policies backed by GeoNode's standard resource permissions:

- **Everyone** grants `download` to GeoNode's anonymous and registered-member
  principals.
- **Only me and administrators** removes organization access and grants `none`
  to those public principals. The owner's existing grant is preserved;
  GeoNode administrators retain their normal administrative access.
- **Me, my group, and administrators** additionally grants `download` to the
  selected GeoNode group. The choices come from
  `GET /api/v2/users/{user_id}/groups` and therefore require no Mirante group
  registry.

Mirante applies the selected policy with
`GET/PUT /api/v2/resources/{id}/permissions`, waits for GeoNode's asynchronous
permission execution, and reads the permissions again before declaring the
upload successful. GeoNode remains authoritative and may reject the operation
if the uploader cannot manage that resource's permissions.

Set `VITE_DATASET_UPLOAD_VISIBILITY_CONTROL=false` to remove this behavior
entirely. Mirante then sends the same importer request as before and does not
make group or permission calls. With the supplied local GeoNode defaults
(`DEFAULT_ANONYMOUS_PERMISSIONS=download` and
`DEFAULT_REGISTERED_MEMBERS_PERMISSIONS=download`), the new dataset is visible
to everyone.

GeoNode's importer creates the resource before its separate permission update
can run. Consequently, a deployment whose server defaults are public can have
a short public interval before Mirante applies a private or group policy. A
fail-closed deployment should set both GeoNode default permissions to `none`;
if visibility control is later disabled, those server settings must be changed
back to `download` to recover the public-by-default behavior.

## Current limits

- Permission changes are reflected after the user signs in again or reloads Mirante and restores the session.
- Mirante does not provide a permission administration interface; administrators manage users and groups in GeoNode.
- Visibility selection assigns one initial policy; advanced sharing and later changes remain in GeoNode's management interface.
