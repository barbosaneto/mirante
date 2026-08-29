# Internationalization

The official Mirante distribution ships with English and Brazilian Portuguese.
English is its fallback locale. Locale identifiers are strings in the public
contract, so adding another language does not require changing an internal union.

The initial locale is selected in this order:

1. A valid preference stored under `mirante.locale`.
2. The first supported browser locale.
3. English.

The shell language selector changes the locale without reloading, persists explicit choices, and updates the document `lang` attribute. Dates, numbers, and file sizes should use the formatters exported by `@mirante/i18n`.

Core catalogs are separated into `common`, `layers`, and `map` namespaces. Tests compare leaf keys in both directions so a key added to only one locale fails the quality checks.

Distributions register locale labels and may provide complete resources for new
locales:

```ts
i18n: {
  fallbackLocale: "en",
  locales: [
    { id: "en", label: "English" },
    {
      id: "es",
      label: "Español",
      resources: {
        common: spanishCommon,
        authentication: spanishAuthentication,
        // Provide every namespace used by the enabled application features.
      },
    },
  ],
}
```

Locale labels are owned by the distribution and are shown directly in their
native language. A new locale should supply every core namespace enabled by that
distribution. The fallback remains available for missing keys.

Extensions provide locale bundles in their public definition. The application
registers each bundle in an isolated namespace when the extension is composed.
Extension translation maps accept any configured locale identifier.
