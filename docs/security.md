# Security architecture

This document describes Mirante's trust boundaries and secure deployment
requirements. Vulnerability reporting is covered by the repository-level
[security policy](../SECURITY.md).

## Trust boundaries

Mirante runs in the browser. GeoNode and GeoServer are remote security
boundaries even when the development stack runs them on the same machine.
Dataset files, API payloads, map attributes, saved map state, URLs returned by
services, and extension definitions must be treated as untrusted input.

The browser interface is not an authorization boundary. GeoNode must enforce
every protected operation and resource permission independently of whether
Mirante renders or disables a control.

## Authentication and request integrity

- GeoNode owns authentication and the Django session.
- Session cookies remain HttpOnly and are not stored by Mirante code.
- State-changing requests use CSRF tokens obtained from GeoNode.
- Passwords and CSRF values are not persisted or logged.
- Social login secrets and callback configuration remain in GeoNode.
- Authentication-provider paths registered by extensions must be same-origin.
- The recommended reverse-proxy topology keeps Mirante and GeoNode routes on
  one public origin.

Separate-origin deployments must deliberately configure HTTPS, cookie flags,
CSRF trusted origins, and CORS. They are not made permissive automatically.

## Input and response handling

- API and execution payloads receive structural validation and bounded list,
  string, page, and geometry processing.
- Backend error details are stripped of control characters, bounded, and do
  not expose HTML debug pages in the interface.
- URLs returned by GeoNode are normalized back through the configured backend
  route rather than trusted as arbitrary browser destinations.
- CQL filters use a fixed operator set, escaped identifiers and values, typed
  number and date parsing, and bounded condition counts and lengths.
- Feature-info results are bounded and rendered as React text rather than raw
  HTML.
- KML validation rejects document type and entity declarations.
- ZIP validation rejects traversal paths, excessive entries, excessive
  expanded size, dangerous compression ratios, and unsupported filenames.
- Upload filenames are normalized before being sent to GeoNode.

Client validation improves feedback and limits accidental resource use. It does
not replace GeoNode importer validation, malware controls, archive inspection,
or server-side upload limits.

## Development proxy and headers

The Vite development server proxies an explicit list of GeoNode route prefixes
and sets `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive
`Permissions-Policy`. The HTML entry point also sets the referrer policy.

Vite is a development server, not the production edge. A production deployment
must serve the static build through a maintained web server or CDN and define:

- HTTPS and secure cookie behavior.
- A Content Security Policy matching configured map and GeoNode origins.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin` or stricter.
- A restrictive `Permissions-Policy`.
- Clickjacking protection appropriate to embedding requirements.
- Request and upload size limits coordinated with GeoNode.
- Rate limiting, logging, backups, and secret rotation appropriate to the
  environment.

## Extensions

Extensions execute with the same browser privileges as the application. Only
trusted modules should be installed. Mirante deliberately supports build-time
modules rather than loading arbitrary remote code. Capability declarations
control presentation but do not grant server permissions.

## Dependency and container security

`npm run security:audit` checks the resolved JavaScript dependency tree.
Production workflows should additionally generate an SBOM, scan final images,
pin reviewed artifacts, monitor GeoNode and GeoServer advisories, and rebuild
regularly. Those automated supply-chain checks are planned separately.

The Compose file contains development defaults and is not a production
security baseline. Replace every secret, disable debug behavior, review signup
and anonymous permissions, configure trusted public origins, and use managed
persistent storage before exposing it publicly.

## Residual risks

- No automated browser end-to-end security regression suite exists yet.
- No production image or production reverse-proxy configuration exists yet.
- Dependency audit results describe known advisories at scan time, not an
  absence of vulnerabilities.
- Dataset visibility is applied after importer completion. Public GeoNode
  defaults can create a short public interval before a private policy is
  applied; fail-closed deployments should use private server defaults.
- Third-party tile services receive map tile coordinates and request metadata
  according to browser and provider behavior.
