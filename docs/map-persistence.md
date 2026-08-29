# Map persistence

Mirante saves maps as standard resources in vanilla GeoNode 5.1.0. No custom backend endpoint, model, or GeoNode plugin is required.

## Saving

Authenticated users with GeoNode's `add_resource` permission can open the map library and provide a title. Mirante sends `POST /api/v2/maps?include[]=data` with:

- The geographic center and zoom in the standard map `data` document.
- The selected base map in the versioned `mirante` section.
- WMS layer descriptions in the standard map layer array.
- Dataset relations, visibility, opacity, and ordering in `maplayers`.
- A versioned `mirante` section inside `data` for faithful restoration by Mirante, including simple filters and compound `AND`/`OR` groups.

Active filters are also serialized into the standard WMS layer `CQL_FILTER` parameter so the GeoNode map representation retains the filtered visualization outside Mirante when supported by the consuming client.

The map is owned, permissioned, listed, and managed by GeoNode like any other map resource.

Once a saved map is open, users with the save capability can replace its current
configuration through `PATCH /api/v2/maps/{id}?include[]=data`. GeoNode remains
the authority for ownership and change permission.

## Opening

The library lists resources visible to the current session through
`GET /api/v2/maps`, with server-side title search and pagination. Opening a map
retrieves its full representation with `GET /api/v2/maps/{id}?include[]=data`,
then retrieves every referenced dataset from the dataset API before changing the
current map.

Mirante restores the active datasets, visibility, opacity, filters, order,
base map, center, and zoom. It also supports GeoNode maps without the `mirante`
section when their standard `maplayers` include dataset relations and their
`data` document contains a geographic center and zoom. Older and external maps
without a Mirante base-map identifier use OpenStreetMap.

## Authorization

Map listing and retrieval remain subject to GeoNode's resource permissions. Saving uses the same compact `add_resource` capability already returned by the vanilla user API. Users without it can open accessible maps but do not see the save form.

## Current limits

- A map cannot be restored when a referenced dataset has been deleted or is no longer visible to the current user.
- Mirante restores dataset WMS layers; specialized remote or non-dataset layers from third-party GeoNode clients are ignored.
