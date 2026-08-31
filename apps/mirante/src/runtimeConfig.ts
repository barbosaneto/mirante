export interface MiranteRuntimeConfig {
  datasetUploadMaximumFileSizeBytes?: number;
  datasetUploadVisibilityControl?: boolean;
  geonodeBaseUrl?: string;
  geonodeWebUrl?: string;
  googleOidcEnabled?: boolean;
  requireAuthentication?: boolean;
}

declare global {
  interface Window {
    __MIRANTE_RUNTIME_CONFIG__?: unknown;
  }
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readMiranteRuntimeConfig(
  source: unknown = window.__MIRANTE_RUNTIME_CONFIG__,
): Readonly<MiranteRuntimeConfig> {
  if (!source || typeof source !== "object" || Array.isArray(source)) return {};

  const values = source as Record<string, unknown>;
  return {
    datasetUploadMaximumFileSizeBytes: optionalPositiveInteger(
      values.datasetUploadMaximumFileSizeBytes,
    ),
    datasetUploadVisibilityControl: optionalBoolean(
      values.datasetUploadVisibilityControl,
    ),
    geonodeBaseUrl: optionalString(values.geonodeBaseUrl),
    geonodeWebUrl: optionalString(values.geonodeWebUrl),
    googleOidcEnabled: optionalBoolean(values.googleOidcEnabled),
    requireAuthentication: optionalBoolean(values.requireAuthentication),
  };
}
