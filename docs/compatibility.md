# Compatibility

Mirante integrates with public behavior from an unmodified GeoNode instance.
Compatibility is version-specific because authentication, serializers,
importers, permission workflows, and map resources can change between GeoNode
releases.

## GeoNode

| GeoNode version        | Status             | Notes                                                                                                                                      |
| ---------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.1.0                  | Supported in 0.1.0 | Local stack version; authentication, catalogue, upload, styling, permissions, WMS, WFS, and map flows are implemented against this version |
| Other 5.1.x releases   | Not yet certified  | May work, but require regression validation before being listed as supported                                                               |
| 5.0.x and earlier      | Not supported      | API and importer differences have not been evaluated                                                                                       |
| Later feature releases | Not supported yet  | Add only after contract review and a compatibility increment                                                                               |

Unit tests validate Mirante's client contracts with controlled responses. They
do not by themselves certify an upstream GeoNode version. A version becomes
supported only after the project records real integration coverage for its
critical flows.

## Browser and host targets

Mirante uses standard evergreen-browser APIs and produces a static Vite build.
A formal browser matrix and Playwright coverage have not been established yet.

The development stack builds without forcing a Compose platform. Release images
must build successfully for both `linux/amd64` and `linux/arm64` before the
GitHub Release is created. This validates the container build for both targets;
it does not replace real browser and GeoNode integration testing on every host.

## Compatibility changes

A pull request that changes an upstream endpoint, payload, required setting,
container version, browser baseline, or extension contract must:

1. Update this matrix.
2. Link the official upstream contract.
3. Add automated mapping or contract tests.
4. Describe real integration validation performed.
5. Record migration notes in `CHANGELOG.md` when users or distributions must
   act.
