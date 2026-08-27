# Internationalization

Mirante ships with English and Brazilian Portuguese. English is the fallback locale.

The initial locale is selected in this order:

1. A valid preference stored under `mirante.locale`.
2. The first supported browser locale.
3. English.

The shell language selector changes the locale without reloading, persists explicit choices, and updates the document `lang` attribute. Dates, numbers, and file sizes should use the formatters exported by `@mirante/i18n`.

Core catalogs are separated into `common`, `layers`, and `map` namespaces. Tests compare leaf keys in both directions so a key added to only one locale fails the quality checks.

Extensions provide locale bundles in their public definition. The application registers each bundle in an isolated namespace when the extension is composed.
