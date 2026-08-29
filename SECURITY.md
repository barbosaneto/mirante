# Security policy

## Supported versions

Mirante has not published a stable release yet. Until the first release, the
current default branch is the only version receiving security fixes. Supported
release lines will be listed here when releases begin.

| Version                                 | Supported |
| --------------------------------------- | --------- |
| Default branch before the first release | Yes       |
| Unreleased snapshots and older commits  | No        |

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in public issues, discussions, pull
requests, or logs.

Use the repository's
[private vulnerability report](https://github.com/barbosaneto/mirante/security/advisories/new)
when available. If private reporting is unavailable, contact a maintainer
through a private channel shown on the repository owner profile and ask for a
secure reporting channel without including exploit details in the first
message.

Include only the information needed to reproduce and assess the issue:

- Affected revision or version.
- Deployment topology and relevant configuration with secrets removed.
- Reproduction steps or a minimal proof of concept.
- Expected and observed impact.
- Known mitigations.
- Whether the issue has been disclosed elsewhere.

Never include real credentials, session cookies, access tokens, private
datasets, personal data, or production database contents.

## Response process

Maintainers will make a best effort to:

1. Acknowledge a complete report within seven days.
2. Confirm scope and severity or request missing information.
3. Coordinate a fix and a disclosure date with the reporter.
4. Credit the reporter when requested and appropriate.
5. Publish remediation guidance without exposing users prematurely.

These are response targets, not a commercial support-level agreement.

## Scope

Reports are in scope when they concern Mirante source code, its published
artifacts, its development proxy or container configuration, or an integration
decision that makes a supported GeoNode deployment less secure.

Vulnerabilities solely in GeoNode, GeoServer, OpenLayers, a browser, or another
dependency should normally be reported to that upstream project. Please report
them here as well only when Mirante introduces or amplifies the impact.

The technical trust model, deployment requirements, and residual risks are in
[Security architecture](docs/security.md).
