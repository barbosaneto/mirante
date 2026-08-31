# Google OIDC

Mirante enables its Google login reference extension by default and delegates
authentication entirely to the generic OIDC provider shipped by GeoNode 5.1.0.
Mirante never receives the Google client secret or stores access tokens; it
restores the resulting HttpOnly Django session through the same flow used after
password login. Set the Mirante flag to `false` while the GeoNode application
has not been configured.

## Prerequisites

- A public HTTPS origin with Mirante and the proxied GeoNode `/account` and
  `/api` routes on the same origin.
- A Google OAuth 2.0 web application owned by the deployment operator.
- GeoNode administrator access.
- A `SITEURL` that exactly matches the public origin and ends with `/`.

Register the callback for every origin where the flow will actually run. For
the official production instance:

```text
https://mirantegeo.org/account/geonode_openid_connect/login/callback/
```

For the supplied local Mirante development server:

```text
http://localhost:5173/account/geonode_openid_connect/login/callback/
```

If the Google flow will also be initiated directly from the local GeoNode
interface, add its separate callback as well:

```text
http://localhost:8000/account/geonode_openid_connect/login/callback/
```

For another deployment such as `https://maps.example.org`, use:

```text
https://maps.example.org/account/geonode_openid_connect/login/callback/
```

Do not register wildcard redirect URIs. The callback path is fixed; only the
origin changes. This is a server-side authorization-code flow, so an
**Authorized JavaScript origin** is not required by Mirante. If an operator
chooses to register origins in Google, they contain only the scheme and host,
for example `https://mirantegeo.org` and `http://localhost:5173`, with no path.

## 1. Enable GeoNode's provider

For the complete supplied stack, set these values in the private environment:

```dotenv
SOCIALACCOUNT_OIDC_PROVIDER_ENABLED=True
SOCIALACCOUNT_PROVIDER=google
SOCIALACCOUNT_SYNC_USER_GROUPS_ON_LOGIN=NO_SYNC
```

`NO_SYNC` is the safe default because normal Google identity tokens do not
carry GeoNode group memberships. Local administrators continue to manage
groups and permissions in GeoNode. A deployment using custom group claims may
choose another GeoNode-supported strategy only after validating its mapping.

Recreate Django and Celery so both processes load the updated settings. Add the
ARM64 override to the command when the deployment uses it:

```bash
docker compose --env-file .env -f compose.yml up -d --force-recreate django celery
```

Frontend-only deployments must apply the equivalent settings to their existing
GeoNode installation instead.

## 2. Store the Google application in GeoNode

Open GeoNode's Django administration and create a **Social application** under
**Social accounts**:

- Provider: GeoNode OpenID Connect (`geonode_openid_connect`).
- Name: Google.
- Client ID: the Google OAuth web client ID.
- Secret key: the Google OAuth client secret.
- Key: leave empty.
- Sites: select the Django Site matching the public deployment origin.

The client ID and secret belong only in GeoNode's protected database. Do not
put either value in Mirante variables, source files, Compose files, browser
configuration, or documentation.

Review GeoNode's `SOCIALACCOUNT_AUTO_SIGNUP`, account approval, and email
verification policies before admitting users. Enabling a login button does not
grant upload, map-editing, group, or administrator permissions; GeoNode remains
authoritative for every capability.

## 3. Confirm the Mirante extension

The supplied environments enable the extension by default:

Development:

```dotenv
VITE_GOOGLE_OIDC_ENABLED=true
```

Production:

```dotenv
MIRANTE_GOOGLE_OIDC_ENABLED=true
```

Recreate only the Mirante frontend after changing the production flag:

```bash
docker compose --env-file .env -f compose.yml up -d --no-deps mirante
```

The supplied production environment validator also rejects an enabled Mirante
button when the complete stack has not enabled GeoNode's OIDC provider.

The login dialog displays **Continue with Google**. The extension navigates
to `/account/geonode_openid_connect/login/?process=login`, adds a same-origin
return URL, and lets GeoNode complete the callback. Returning users and newly
accepted users are restored through the normal Mirante session flow.

## Disable and troubleshoot

Set the Mirante flag to `false` and recreate only `mirante` to hide the button.
This does not delete linked social accounts or the Social application stored in
GeoNode. Disable the GeoNode provider separately if the login endpoint must
also stop accepting requests.

Common failures:

- **404 on the login route:** GeoNode did not load
  `SOCIALACCOUNT_OIDC_PROVIDER_ENABLED=True`.
- **Provider configuration error:** the Social application is absent, uses the
  wrong provider, or is not attached to the active Django Site.
- **Google redirect mismatch:** the callback registered at Google does not
  exactly match the public HTTPS callback above.
- **Session missing after return:** `SITEURL`, proxy headers, secure-cookie
  settings, or the public origin are inconsistent.
- **User can sign in but cannot upload or save maps:** assign the required
  permissions or group membership in GeoNode; social login establishes
  identity but does not bypass authorization.

## Vanilla GeoNode contract

The extension relies on GeoNode 5.1.0's existing
[`SOCIALACCOUNT_OIDC_PROVIDER_ENABLED` and Google provider definition](https://github.com/GeoNode/geonode/blob/5.1.0/geonode/settings.py)
and its bundled
[`geonode_openid_connect` provider](https://github.com/GeoNode/geonode/tree/5.1.0/geonode/people/socialaccount/providers/geonode_openid_connect).
It adds no GeoNode view, model, authentication backend, or plugin.
