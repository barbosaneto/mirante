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

## Development and production proxies

The Vite development server proxies an explicit list of GeoNode route prefixes
and sets `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive
`Permissions-Policy`. The HTML entry point also sets the referrer policy.

Vite is a development server, not the production edge. The supplied production
image serves the static build with an unprivileged Nginx process, validates
runtime values, proxies only explicit GeoNode integration and management route
prefixes, applies baseline response headers, limits request size, and exposes a
static-server healthcheck.
The example Compose drops capabilities, prevents privilege escalation, and uses
a read-only root filesystem.

The deployment edge must still define:

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
Production release workflows generate an SBOM and provenance attestation for
the frontend and ARM64 compatibility images, verify the architectures of the
referenced upstream images, and pin explicit component tags in the distributed
Compose. Upstream images retain their publishers' supply-chain metadata.
Automated final-image vulnerability scanning, GeoNode and GeoServer advisory
monitoring, and scheduled rebuild policy remain operational follow-up work.

The root Compose file contains development defaults and is not a production
security baseline. `compose.production.yml` hardens only the stateless Mirante
frontend. `compose.stack.production.yml` supplies conservative complete-stack
defaults, but operators must still replace every secret, review signup and
anonymous permissions, configure the public edge, arrange off-host backups, and
monitor resource use before exposing the system publicly.

## Residual risks

- No automated browser end-to-end security regression suite exists yet.
- The production stack does not terminate public TLS, rate-limit clients,
  schedule backups, or replace external monitoring; container healthchecks are
  local orchestration signals only.
- Full-stack availability remains a single-host failure domain in the supplied
  Compose topology.
- Dependency audit results describe known advisories at scan time, not an
  absence of vulnerabilities.
- Dataset visibility is applied after importer completion. Public GeoNode
  defaults can create a short public interval before a private policy is
  applied; fail-closed deployments should use private server defaults.
- Third-party tile services receive map tile coordinates and request metadata
  according to browser and provider behavior.
