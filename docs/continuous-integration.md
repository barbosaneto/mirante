# Continuous integration and container publication

Mirante uses GitHub Actions for repository checks and artifact publication. The
workflows build and verify project artifacts but never connect to, configure, or
deploy an operator's server.

## Continuous integration

`.github/workflows/ci.yml` runs for pull requests, pushes to `main`, and manual
dispatches. It uses locked npm dependencies and executes:

- Formatting, lint, strict TypeScript, tests, and the application build.
- The high-severity npm dependency audit.
- Shell syntax and both production Compose configuration checks.
- A production container build and hardened runtime smoke test.

The workflow has read-only repository permission. Third-party Actions are pinned
to full commit SHAs, with the reviewed release beside each pin. Maintainers
should review upstream release notes and update both the SHA and comment
together.

Recommended branch protection for `main` requires the `Quality` and
`Production image` checks, requires the branch to be current before merging,
and prevents bypass except for documented emergency maintenance. A repository
ruleset should also restrict creation and deletion of tags matching `v*` to
release maintainers; the workflow validates a tag but does not decide who may
create it.

## Container publication

`.github/workflows/publish-image.yml` runs only after a tag matching `v*.*.*` is
pushed. It rejects tags that are not valid Semantic Versions or whose version,
workspace manifests, lockfile, changelog, and release notes are inconsistent.
Publication therefore remains dormant until maintainers intentionally prepare
and push a release tag.

After repeating all release checks, the workflow publishes the production image
for `linux/amd64` and `linux/arm64` to:

```text
ghcr.io/<repository-owner>/<repository-name>
```

For a stable `v0.2.3` release, the image receives `0.2.3`, `0.2`, and `latest`.
Pre-releases do not update `latest`. A mutable major tag starts at version 1.0;
there is deliberately no ambiguous `0` tag. Deployments must use the complete,
immutable release version rather than `latest` or a minor tag.

The image includes an SPDX SBOM and a GitHub build-provenance attestation tied
to the published digest. The image supports both the common x86-64 server
architecture and ARM64 hosts without an architecture override in Compose. Only
after image publication and attestation succeed does the workflow create the
GitHub Release from `docs/releases/<version>.md`, including the immutable image
digest.

## Permissions and secrets

The publication job grants the built-in `GITHUB_TOKEN` only these additional
permissions:

- `packages: write` to push the container.
- `id-token: write` and `attestations: write` to create provenance.
- `contents: write`, isolated in the final job, to create the GitHub Release.

No personal access token, SSH credential, production environment, domain
certificate, or deployment secret is required. Repository settings must allow
workflows to publish packages. The OCI source label links the package to its
source repository so package access can inherit repository permissions.

GitHub creates the first GHCR package as private even when its source repository
is public. After the first successful release, a package administrator must open
`Package settings`, choose `Change visibility`, and make it public. This is a
one-time, irreversible publishing decision that cannot happen before the package
exists. Once public, the release image can be pulled anonymously and no registry
credential belongs on the deployment host.

## Pulling an image on a deployment host

After the package visibility is public, pull the immutable release directly:

```bash
docker pull ghcr.io/barbosaneto/mirante:0.1.0
```

Set `MIRANTE_IMAGE=ghcr.io/barbosaneto/mirante` and the complete release version
in the private production environment, then follow the update procedure in
[Production deployment](deployment.md). Do not configure `docker login` for the
public package.

## Failure and retry behavior

A failed validation never publishes an image. A failed multi-platform build may
be retried from the Actions interface after the cause is understood; cache reuse
does not change the resulting source revision. Tags are release records and must
not be moved or recreated to replace a published image. Correct the source and
publish a new patch or pre-release version instead.
