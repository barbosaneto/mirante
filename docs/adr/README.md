# Architecture decision records

Architecture decision records capture choices that affect Mirante's public
contracts, integration boundaries, or operation. They describe why a decision
was made; implementation guides describe how to use it.

| ADR                                            | Decision                                          | Status   |
| ---------------------------------------------- | ------------------------------------------------- | -------- |
| [0001](0001-target-geonode-5-1.md)             | Target GeoNode 5.1.0                              | Accepted |
| [0002](0002-workspace-package-boundaries.md)   | Use explicit workspace package boundaries         | Accepted |
| [0003](0003-geonode-session-authentication.md) | Use GeoNode Django session authentication         | Accepted |
| [0004](0004-vanilla-geonode-ingestion.md)      | Use vanilla asynchronous GeoNode ingestion        | Accepted |
| [0005](0005-build-time-extensions.md)          | Support build-time extensions, not remote plugins | Accepted |
| [0006](0006-runtime-internationalization.md)   | Use runtime namespaced internationalization       | Accepted |
| [0007](0007-docker-development-stack.md)       | Maintain a reproducible Docker development stack  | Accepted |
| [0008](0008-apache-2-license.md)               | License independent Mirante code under Apache 2.0 | Accepted |

New records use the next four-digit number and contain context, decision, and
consequences. Accepted records are not rewritten to hide an old decision;
superseding records link to both the old and new choice.
