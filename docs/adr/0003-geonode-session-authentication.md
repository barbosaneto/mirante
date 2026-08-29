# ADR 0003: Use GeoNode Django session authentication

- Status: Accepted
- Date: 2026-08-29

## Context

Mirante must authenticate users against vanilla GeoNode without storing raw
credentials or introducing a second identity system. Protected browser
requests also require CSRF protection and compatible cookie behavior.

## Decision

Use GeoNode's existing Django login, logout, session, CSRF, user-info, and user
profile endpoints. Prefer a same-origin proxy topology. Keep session cookies
HttpOnly and never persist passwords, cookies, tokens, or CSRF values in
application storage.

## Consequences

- GeoNode remains the identity and authorization authority.
- Mirante can restore password and social-login sessions through one path.
- Separate-origin deployments require deliberate cookie, HTTPS, CSRF, and CORS
  configuration and are not enabled by relaxing protections.
