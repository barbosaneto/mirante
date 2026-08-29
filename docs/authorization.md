# Authorization

GeoNode is the only authorization authority. Mirante does not maintain users,
groups, roles, or grants, and hiding a control is never treated as a security
boundary.

## Derived roles and capabilities

The application derives conceptual roles from the authenticated GeoNode user:

| Conceptual role    | GeoNode source                    | Mirante behavior                     |
| ------------------ | --------------------------------- | ------------------------------------ |
| Visitor            | No authenticated session          | Browse public resources only         |
| Authenticated user | Valid Django session              | Browse resources visible to the user |
| Contributor        | Compact `add_resource` permission | Upload datasets and create maps      |
| Owner or editor    | Per-resource edit permission      | Update the specific accessible map   |
| Administrator      | `is_staff` or `is_superuser`      | Administrative capabilities          |

Roles can overlap: every signed-in person is an authenticated user, while
contributor and administrator status are derived independently. The mapped user exposes `roles`,
`canUploadDatasets`, `canCreateMaps`, and `canManageGeoNode`. An opened map
separately exposes its owner, current-user permissions, and `canEdit` /
`canManage` capabilities.

The UI uses these capabilities to present operations. GeoNode still checks
every POST and PATCH request and can reject a stale client capability.

## Extension access

Extensions can restrict toolbar actions and panels through the same derived
capabilities. This lets a distribution target functionality at authenticated
users, contributors, administrators, editors, or managers without reproducing
GeoNode groups in frontend configuration.

For example, `access: { allOf: ["uploadDatasets"] }` targets contributors,
while `access: { allOf: ["editCurrentMap"] }` follows the permissions of the
map currently open. `allOf` and `anyOf` allow combined policies. The complete
contract and examples are documented in [Extensions](extensions.md).

These requirements only control entry points in Mirante. GeoNode must enforce
the protected operation because browser code can always be invoked outside the
visible interface.

## Vanilla GeoNode limitation

GeoNode 5.1.0 protects both dataset upload and map creation with the same Django
permission, `base.add_resourcebase`, exposed as compact `add_resource`.
Consequently, a secure self-service role that can create maps but cannot upload
datasets cannot be implemented by Mirante against an unmodified GeoNode.

An administrator can still let a user without `add_resource` edit selected maps
by creating those maps first and assigning edit permission to that user or a
group. Mirante will allow updates to those maps but will not show its new-map or
dataset-upload actions.

## Administration

Assign global and object permissions in GeoNode, preferably through groups.
The standard Contributors group is the natural place for
`base.add_resourcebase`. Ownership and the standard GeoNode sharing interface
control editing and management of individual maps.

Permission changes take effect when Mirante reloads the user or resource. No
parallel permission configuration exists in the frontend.
