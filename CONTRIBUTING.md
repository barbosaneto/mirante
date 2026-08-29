# Contributing to Mirante

Thank you for helping improve Mirante. The project is experimental and its
public contracts may still evolve, but contributions should keep the codebase
easy to understand, extend, translate, and operate with an unmodified GeoNode.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
Security reports must follow [SECURITY.md](SECURITY.md), not the public issue
tracker.

## Before starting

1. Search existing issues and pull requests.
2. Open an issue before a large feature, architectural change, new dependency,
   or public SDK change.
3. Confirm that the work belongs in Mirante rather than GeoNode, GeoServer, or
   another upstream project.
4. Keep one pull request focused on one reviewable outcome.

Small documentation fixes and narrowly scoped bug fixes do not require a
proposal issue.

## Development setup

Requirements:

- Node.js 18.18 or newer.
- npm 10.
- Docker Engine 24 or newer with Docker Compose v2 when exercising the local
  GeoNode stack.

Install and validate the frontend:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run format:check
```

Start the frontend development server with `npm run dev`. To exercise the full
local stack, copy `.env.example` to `.env`, replace development secrets when
appropriate, and run:

```bash
docker compose up --build -d --wait
```

Do not include `.env`, credentials, private datasets, tokens, database dumps,
or production logs in issues or commits.

## Architecture rules

- Keep GeoNode payload parsing and API calls in `packages/geonode`.
- Keep OpenLayers objects behind the facade in `packages/map`.
- Put supported extension contracts in `packages/sdk`; extensions must not
  import package internals.
- Keep application composition and registries in `packages/core`.
- Keep shared locale infrastructure in `packages/i18n`.
- Keep distribution-owned branding, base maps, locales, and feature choices in
  `apps/mirante`.
- Do not add a separate backend for behavior already provided by vanilla
  GeoNode.
- Do not add runtime-loaded remote plugins.

See [Architecture](docs/architecture.md) and the
[architecture decisions](docs/adr/README.md) before changing package
boundaries.

## Code and documentation

- Use strict TypeScript and descriptive names.
- Avoid `any`, hidden mutable state, and broad utility modules.
- Add or update tests for changed behavior.
- Route every user-visible string through internationalization.
- Keep English and Brazilian Portuguese base catalogs synchronized.
- Write source code, comments, tests, commit messages, and documentation in
  English.
- Explain decisions in comments; do not narrate obvious code.
- Update documentation and `CHANGELOG.md` when behavior or public contracts
  change.
- Avoid unrelated formatting or refactoring in the same pull request.

Run `npm run format` only when you intend to apply formatting changes.

## GeoNode integration changes

Mirante targets the version documented in
[Compatibility](docs/compatibility.md). Before adding or changing an endpoint:

1. Check the matching official GeoNode source or API documentation.
2. Keep upstream payloads separate from Mirante domain models.
3. Add bounded response validation and useful errors without exposing secrets.
4. Test the mapping with fixtures.
5. Exercise the flow against a real GeoNode instance when feasible.
6. State clearly when real integration has not been verified.

Mocks prove client behavior, not upstream compatibility.

## Pull requests

Pull requests should:

- Describe the user-visible outcome and motivation.
- Link the related issue when one exists.
- Include manual verification steps.
- List automated checks and their results.
- Identify known limitations and compatibility implications.
- Include screenshots for meaningful visual changes.
- Pass the pull request checklist.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
messages when practical, for example:

```text
feat: add a dataset catalogue filter
fix: preserve the active layer order
docs: explain institutional branding
```

Maintainers may squash a pull request to keep project history focused.

## Contribution license

The project does not currently require a contributor license agreement. Unless
you explicitly state otherwise, a contribution intentionally submitted for
inclusion in Mirante is provided under the Apache License 2.0, as described in
Section 5 of that license. Only submit work you have the right to contribute,
and preserve attribution and license notices for incorporated third-party
material.
