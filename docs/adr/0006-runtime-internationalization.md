# ADR 0006: Use runtime namespaced internationalization

- Status: Accepted
- Date: 2026-08-29

## Context

Mirante must switch languages without reload, provide a reliable English
fallback, and let institutional distributions and extensions add locales
without changing an internal language union.

## Decision

Use i18next and react-i18next with domain namespaces. Ship English and Brazilian
Portuguese, detect and persist the user's locale, validate base-catalog parity,
and isolate extension translations in extension-specific namespaces.

## Consequences

- User-visible component text uses translation keys.
- New locales are distribution data rather than core type changes.
- Enabled features need complete namespace resources or intentionally rely on
  the English fallback.
