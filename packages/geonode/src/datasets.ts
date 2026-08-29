import { createDatasetStyleFile, type DatasetUploadStyle } from "./sld";
import {
  serializeGeoNodeAttributeFilter,
  type GeoNodeAttributeFilter,
} from "./filters";

export interface GeoNodeDataset {
  id: number;
  title: string;
  layerName: string;
  wmsUrl: string;
  extent: readonly [minX: number, minY: number, maxX: number, maxY: number];
}

export interface GeoNodeDatasetPage {
  datasets: readonly GeoNodeDataset[];
  page: number;
  pageSize: number;
  total: number;
}

export interface GeoNodeGroup {
  id: number;
  profileId: number;
  title: string;
}

export interface GeoNodeDatasetFeature {
  id: string;
  attributes: Readonly<Record<string, unknown>>;
  geometry: Readonly<Record<string, unknown>> | null;
  extent?: readonly [
    minLongitude: number,
    minLatitude: number,
    maxLongitude: number,
    maxLatitude: number,
  ];
}

export interface GeoNodeDatasetFeaturePage {
  features: readonly GeoNodeDatasetFeature[];
  hasNext: boolean;
  page: number;
  pageSize: number;
  total?: number;
}

export interface ListGeoNodeDatasetsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  signal?: AbortSignal;
}

export interface ListGeoNodeDatasetFeaturesOptions {
  filter?: GeoNodeAttributeFilter;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export type GeoNodeDatasetExportFormat = "csv" | "geojson";

export interface ExportGeoNodeDatasetFeaturesOptions {
  filter?: GeoNodeAttributeFilter;
  format: GeoNodeDatasetExportFormat;
  signal?: AbortSignal;
}

export interface GeoNodeDatasetFeatureExport {
  blob: Blob;
  filename: string;
}

export type DatasetIngestionStage =
  | "metadata"
  | "permissions"
  | "processing"
  | "retrieving"
  | "styling"
  | "uploading";

export interface DatasetIngestionProgress {
  stage: DatasetIngestionStage;
  percentage: number;
}

export type DatasetIngestionErrorCode =
  | "csrf-unavailable"
  | "metadata-update-failed"
  | "network"
  | "permission-denied"
  | "permissions-update-failed"
  | "processing-failed"
  | "session-expired"
  | "style-update-failed"
  | "timeout"
  | "unexpected-response"
  | "upload-rejected";

export class GeoNodeDatasetIngestionError extends Error {
  readonly code: DatasetIngestionErrorCode;

  constructor(code: DatasetIngestionErrorCode, message: string) {
    super(message);
    this.name = "GeoNodeDatasetIngestionError";
    this.code = code;
  }
}

export interface UploadDatasetOptions {
  metadata?: DatasetUploadMetadata;
  onProgress?: (progress: DatasetIngestionProgress) => void;
  signal?: AbortSignal;
  style?: DatasetUploadStyle;
  visibility?: DatasetUploadVisibility;
}

export type DatasetUploadVisibility =
  | { access: "group"; groupId: number }
  | { access: "private" }
  | { access: "public" };

export interface DatasetUploadMetadata {
  title?: string;
  abstract?: string;
}

export interface GeoNodeDatasetClient {
  exportDatasetFeatures(
    dataset: GeoNodeDataset,
    options: ExportGeoNodeDatasetFeaturesOptions,
  ): Promise<GeoNodeDatasetFeatureExport>;
  getDataset(id: number, signal?: AbortSignal): Promise<GeoNodeDataset>;
  listDatasetFeatures(
    dataset: GeoNodeDataset,
    options?: ListGeoNodeDatasetFeaturesOptions,
  ): Promise<GeoNodeDatasetFeaturePage>;
  listDatasets(
    options?: ListGeoNodeDatasetsOptions,
  ): Promise<GeoNodeDatasetPage>;
  listUserGroups(userId: number, signal?: AbortSignal): Promise<GeoNodeGroup[]>;
  uploadDataset(
    file: File,
    options?: UploadDatasetOptions,
  ): Promise<GeoNodeDataset>;
}

interface CreateDatasetClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

interface ExecutionPayload {
  status: "failed" | "finished" | "ready" | "running";
  log: string | null;
  output_params: {
    resources?: Array<{ id: number }>;
  };
}

type GeoNodeCompactPermission =
  | "download"
  | "edit"
  | "manage"
  | "none"
  | "owner"
  | "view";

interface GeoNodeCompactPermissionEntry {
  id: number;
  name?: string;
  permissions: GeoNodeCompactPermission;
}

interface GeoNodeCompactPermissionSpec {
  groups: GeoNodeCompactPermissionEntry[];
  organizations: GeoNodeCompactPermissionEntry[];
  users: GeoNodeCompactPermissionEntry[];
}

const maximumDiagnosticDetailLength = 500;
const maximumGeometryValues = 100_000;
const maximumSearchLength = 255;
const compactPermissions = new Set<GeoNodeCompactPermission>([
  "download",
  "edit",
  "manage",
  "none",
  "owner",
  "view",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl === "/" || baseUrl === "") {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function clampPositiveInteger(
  value: number,
  fallback: number,
  maximum: number,
): number {
  return Number.isFinite(value)
    ? Math.max(1, Math.min(maximum, Math.trunc(value)))
    : fallback;
}

function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
      `${label} must be a positive integer.`,
    );
  }
  return value;
}

function sanitizeDiagnosticDetail(value: string | null): string | null {
  if (!value) return null;
  const withoutControls = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      code === 127
      ? " "
      : character;
  }).join("");
  const detail = withoutControls.replace(/\s+/g, " ").trim();
  return detail ? detail.slice(0, maximumDiagnosticDetailLength) : null;
}

function executionStatusPath(
  executionId: unknown,
  errorCode: DatasetIngestionErrorCode,
): string {
  if (
    typeof executionId !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(executionId)
  ) {
    throw new GeoNodeDatasetIngestionError(
      errorCode,
      "GeoNode returned an invalid execution identifier.",
    );
  }

  return `/api/v2/resource-service/execution-status/${encodeURIComponent(executionId)}`;
}

function datasetExportFilename(
  dataset: GeoNodeDataset,
  format: GeoNodeDatasetExportFormat,
): string {
  const stem = dataset.title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${stem || `dataset-${dataset.id}`}.${format === "csv" ? "csv" : "geojson"}`;
}

function normalizeBackendUrl(baseUrl: string, value: string): string {
  try {
    const url = new URL(value);
    return joinUrl(baseUrl, `${url.pathname}${url.search}`);
  } catch {
    return joinUrl(baseUrl, value.startsWith("/") ? value : `/${value}`);
  }
}

function parseCsrfToken(html: string): string {
  const match = html.match(
    /name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/,
  );

  if (!match?.[1]) {
    throw new GeoNodeDatasetIngestionError(
      "csrf-unavailable",
      "GeoNode did not provide a CSRF token.",
    );
  }

  return match[1];
}

function parseExecutionPayload(
  value: unknown,
  errorCode: DatasetIngestionErrorCode = "unexpected-response",
): ExecutionPayload {
  if (
    !isRecord(value) ||
    !["failed", "finished", "ready", "running"].includes(
      String(value.status),
    ) ||
    !(value.log === null || typeof value.log === "string") ||
    !isRecord(value.output_params)
  ) {
    throw new GeoNodeDatasetIngestionError(
      errorCode,
      "GeoNode returned an invalid execution response.",
    );
  }

  return value as unknown as ExecutionPayload;
}

function parseDatasetPayload(baseUrl: string, value: unknown): GeoNodeDataset {
  if (!isRecord(value) || !isRecord(value.dataset)) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
      "GeoNode returned an invalid dataset response.",
    );
  }

  const dataset = value.dataset;
  const extent = dataset.extent;
  const rawId = dataset.pk;
  const id = typeof rawId === "string" ? Number(rawId) : rawId;

  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    typeof dataset.title !== "string" ||
    typeof dataset.alternate !== "string" ||
    typeof dataset.dataset_ows_url !== "string" ||
    !isRecord(extent) ||
    extent.srid !== "EPSG:4326" ||
    !Array.isArray(extent.coords) ||
    extent.coords.length !== 4 ||
    !extent.coords.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  ) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
      "GeoNode returned incomplete dataset visualization data.",
    );
  }

  return {
    id,
    title: dataset.title,
    layerName: dataset.alternate,
    wmsUrl: normalizeBackendUrl(baseUrl, dataset.dataset_ows_url),
    extent: extent.coords as [number, number, number, number],
  };
}

function parseCatalogDataset(
  baseUrl: string,
  value: unknown,
): GeoNodeDataset | null {
  if (!isRecord(value)) {
    return null;
  }

  const extent = value.extent;
  const rawId = value.pk;
  const id = typeof rawId === "string" ? Number(rawId) : rawId;

  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    typeof value.title !== "string" ||
    typeof value.alternate !== "string" ||
    value.is_published !== true ||
    value.processed !== true ||
    !isRecord(extent) ||
    extent.srid !== "EPSG:4326" ||
    !Array.isArray(extent.coords) ||
    extent.coords.length !== 4 ||
    !extent.coords.every(
      (coordinate) =>
        typeof coordinate === "number" && Number.isFinite(coordinate),
    )
  ) {
    return null;
  }

  return {
    id,
    title: value.title,
    layerName: value.alternate,
    wmsUrl: joinUrl(baseUrl, "/geoserver/ows"),
    extent: extent.coords as [number, number, number, number],
  };
}

function parseDatasetPage(baseUrl: string, value: unknown): GeoNodeDatasetPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.datasets) ||
    typeof value.total !== "number" ||
    typeof value.page !== "number" ||
    typeof value.page_size !== "number"
  ) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
      "GeoNode returned an invalid dataset catalogue response.",
    );
  }

  return {
    datasets: value.datasets
      .map((dataset) => parseCatalogDataset(baseUrl, dataset))
      .filter((dataset): dataset is GeoNodeDataset => dataset !== null),
    total: value.total,
    page: value.page,
    pageSize: value.page_size,
  };
}

function parseUserGroupsPayload(value: unknown): GeoNodeGroup[] {
  if (!Array.isArray(value) || value.length > 500) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
      "GeoNode returned an invalid user groups response.",
    );
  }

  return value.map((candidate) => {
    if (
      !isRecord(candidate) ||
      typeof candidate.pk !== "number" ||
      !Number.isSafeInteger(candidate.pk) ||
      candidate.pk < 1 ||
      typeof candidate.title !== "string" ||
      !candidate.title.trim() ||
      !isRecord(candidate.group) ||
      typeof candidate.group.pk !== "number" ||
      !Number.isSafeInteger(candidate.group.pk) ||
      candidate.group.pk < 1
    ) {
      throw new GeoNodeDatasetIngestionError(
        "unexpected-response",
        "GeoNode returned an invalid user group.",
      );
    }

    return {
      id: candidate.group.pk,
      profileId: candidate.pk,
      title: candidate.title.trim().slice(0, 255),
    };
  });
}

function parseCompactPermissionEntry(
  value: unknown,
): GeoNodeCompactPermissionEntry {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id < 1 ||
    typeof value.permissions !== "string" ||
    !compactPermissions.has(value.permissions as GeoNodeCompactPermission) ||
    !(value.name === undefined || typeof value.name === "string")
  ) {
    throw new GeoNodeDatasetIngestionError(
      "permissions-update-failed",
      "GeoNode returned an invalid permission entry.",
    );
  }

  return {
    id: value.id,
    permissions: value.permissions as GeoNodeCompactPermission,
    ...(typeof value.name === "string" ? { name: value.name } : {}),
  };
}

function parseCompactPermissionSpec(
  value: unknown,
): GeoNodeCompactPermissionSpec {
  if (
    !isRecord(value) ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.organizations) ||
    !Array.isArray(value.users) ||
    value.groups.length > 10 ||
    value.organizations.length > 500 ||
    value.users.length > 500
  ) {
    throw new GeoNodeDatasetIngestionError(
      "permissions-update-failed",
      "GeoNode returned an invalid permission specification.",
    );
  }

  return {
    groups: value.groups.map(parseCompactPermissionEntry),
    organizations: value.organizations.map(parseCompactPermissionEntry),
    users: value.users.map(parseCompactPermissionEntry),
  };
}

function permissionPayload(
  current: GeoNodeCompactPermissionSpec,
  visibility: DatasetUploadVisibility,
): GeoNodeCompactPermissionSpec {
  const publicAccess = visibility.access === "public";
  const organizations =
    visibility.access === "group"
      ? [
          {
            id: requirePositiveInteger(visibility.groupId, "Group id"),
            permissions: "download" as const,
          },
        ]
      : [];

  return {
    users: current.users,
    organizations,
    groups: current.groups.map((group) => ({
      id: group.id,
      ...(group.name ? { name: group.name } : {}),
      permissions: publicAccess ? "download" : "none",
    })),
  };
}

function permissionUpdateMatches(
  permissions: GeoNodeCompactPermissionSpec,
  visibility: DatasetUploadVisibility,
): boolean {
  const expectedSpecialPermission =
    visibility.access === "public" ? "download" : "none";
  const specialGroupsMatch =
    permissions.groups.length > 0 &&
    permissions.groups.every(
      (group) => group.permissions === expectedSpecialPermission,
    );
  if (!specialGroupsMatch) return false;

  const activeOrganizations = permissions.organizations.filter(
    (organization) => organization.permissions !== "none",
  );
  if (visibility.access === "group") {
    return (
      activeOrganizations.length === 1 &&
      activeOrganizations[0]?.id === visibility.groupId &&
      activeOrganizations[0].permissions === "download"
    );
  }

  return activeOrganizations.length === 0;
}

function geometryExtent(
  geometry: Readonly<Record<string, unknown>>,
): GeoNodeDatasetFeature["extent"] {
  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  const pending: unknown[] = [geometry.coordinates, geometry.geometries];
  let visitedValues = 0;

  while (pending.length > 0) {
    visitedValues += 1;
    if (visitedValues > maximumGeometryValues) return undefined;

    const value = pending.pop();
    if (isRecord(value)) {
      pending.push(value.coordinates, value.geometries);
      continue;
    }
    if (!Array.isArray(value)) continue;

    if (
      typeof value[0] === "number" &&
      Number.isFinite(value[0]) &&
      typeof value[1] === "number" &&
      Number.isFinite(value[1])
    ) {
      minLongitude = Math.min(minLongitude, value[0]);
      minLatitude = Math.min(minLatitude, value[1]);
      maxLongitude = Math.max(maxLongitude, value[0]);
      maxLatitude = Math.max(maxLatitude, value[1]);
      continue;
    }

    for (const child of value) pending.push(child);
  }

  return Number.isFinite(minLongitude)
    ? [minLongitude, minLatitude, maxLongitude, maxLatitude]
    : undefined;
}

function parseFeatureTotal(value: unknown): number | null {
  const total =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : null;

  return total !== null && Number.isSafeInteger(total) && total >= 0
    ? total
    : null;
}

function parseDatasetFeaturePage(
  value: unknown,
  page: number,
  pageSize: number,
): GeoNodeDatasetFeaturePage {
  if (!isRecord(value) || !Array.isArray(value.features)) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
      "GeoServer returned an invalid WFS feature collection.",
    );
  }

  const startIndex = (page - 1) * pageSize;
  const parsedFeatures = value.features
    .slice(0, pageSize + 1)
    .map((candidate, index) => {
      if (!isRecord(candidate)) {
        throw new GeoNodeDatasetIngestionError(
          "unexpected-response",
          "GeoServer returned an invalid WFS feature.",
        );
      }

      const properties = isRecord(candidate.properties)
        ? candidate.properties
        : {};
      const geometry = isRecord(candidate.geometry) ? candidate.geometry : null;
      const rawId = candidate.id;

      return {
        id:
          typeof rawId === "string" || typeof rawId === "number"
            ? String(rawId)
            : String(startIndex + index + 1),
        attributes: properties,
        geometry,
        ...(geometry ? { extent: geometryExtent(geometry) } : {}),
      } satisfies GeoNodeDatasetFeature;
    });
  const features = parsedFeatures.slice(0, pageSize);
  const minimumTotal = startIndex + features.length;
  const announcedTotal = parseFeatureTotal(
    value.numberMatched ?? value.totalFeatures,
  );
  const reliableTotal =
    announcedTotal !== null && announcedTotal >= minimumTotal
      ? announcedTotal
      : null;
  const hasNext =
    parsedFeatures.length > pageSize ||
    (reliableTotal !== null && reliableTotal > minimumTotal);

  return {
    features,
    hasNext,
    page,
    pageSize,
    ...(reliableTotal !== null
      ? { total: reliableTotal }
      : !hasNext
        ? { total: minimumTotal }
        : {}),
  };
}

function appendQuery(url: string, query: URLSearchParams): string {
  return `${url}${url.includes("?") ? "&" : "?"}${query.toString()}`;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(resolve, milliseconds);

    signal?.addEventListener(
      "abort",
      () => {
        globalThis.clearTimeout(timeout);
        reject(
          signal.reason instanceof Error
            ? signal.reason
            : new Error("Dataset ingestion was cancelled."),
        );
      },
      { once: true },
    );
  });
}

async function responseErrorDetail(response: Response): Promise<string | null> {
  try {
    const payload: unknown = await response.clone().json();

    if (isRecord(payload) && typeof payload.detail === "string") {
      return sanitizeDiagnosticDetail(payload.detail);
    }
  } catch {
    // The response is not JSON; try its text representation below.
  }

  try {
    const detail = (await response.text()).trim();

    if (
      response.headers.get("Content-Type")?.includes("text/html") ||
      /^<!doctype html|^<html/i.test(detail)
    ) {
      return null;
    }

    return sanitizeDiagnosticDetail(detail);
  } catch {
    return null;
  }
}

function normalizeMetadata(
  metadata: DatasetUploadMetadata | undefined,
): DatasetUploadMetadata | null {
  const title = metadata?.title?.trim();
  const abstract = metadata?.abstract?.trim();

  return title || abstract
    ? {
        ...(title ? { title } : {}),
        ...(abstract ? { abstract } : {}),
      }
    : null;
}

function createGeoNodeSafeUploadFile(file: File): File {
  const extensionIndex = file.name.lastIndexOf(".");
  const originalStem =
    extensionIndex > 0 ? file.name.slice(0, extensionIndex) : file.name;
  const originalExtension =
    extensionIndex > 0 ? file.name.slice(extensionIndex) : "";
  const stem = originalStem
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const extension = originalExtension
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.]+/g, "")
    .toLowerCase();
  const safeName = `${stem || "dataset"}${extension}`;

  if (safeName === file.name) {
    return file;
  }

  return new File([file], safeName, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

export function createGeoNodeDatasetClient({
  baseUrl,
  fetch: fetchImplementation = globalThis.fetch,
  pollIntervalMs = 1_000,
  maxPollAttempts = 300,
}: CreateDatasetClientOptions): GeoNodeDatasetClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      const alreadyNormalized =
        /^https?:\/\//.test(path) ||
        (baseUrl !== "" && baseUrl !== "/" && path.startsWith(baseUrl));

      return await fetchImplementation(
        alreadyNormalized ? path : joinUrl(baseUrl, path),
        {
          ...init,
          credentials: "include",
          headers: {
            Accept: "application/json, text/html",
            ...init?.headers,
          },
        },
      );
    } catch (error) {
      if (init?.signal?.aborted) {
        throw error;
      }

      throw new GeoNodeDatasetIngestionError(
        "network",
        `GeoNode request failed: ${error instanceof Error ? error.message : "unknown network error"}`,
      );
    }
  }

  async function getCsrfToken(signal?: AbortSignal): Promise<string> {
    const response = await request("/account/logout/", { signal });

    if (!response.ok) {
      throw new GeoNodeDatasetIngestionError(
        "csrf-unavailable",
        `GeoNode CSRF request failed with status ${response.status}.`,
      );
    }

    return parseCsrfToken(await response.text());
  }

  async function retrieveDataset(
    datasetId: number,
    signal?: AbortSignal,
  ): Promise<GeoNodeDataset> {
    const safeDatasetId = requirePositiveInteger(datasetId, "Dataset id");
    const response = await request(`/api/v2/datasets/${safeDatasetId}`, {
      signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new GeoNodeDatasetIngestionError(
        "session-expired",
        "The GeoNode session is not authenticated.",
      );
    }

    if (!response.ok) {
      throw new GeoNodeDatasetIngestionError(
        "unexpected-response",
        `GeoNode dataset request failed with status ${response.status}.`,
      );
    }

    return parseDatasetPayload(baseUrl, await response.json());
  }

  async function updateDatasetMetadata(
    datasetId: number,
    metadata: DatasetUploadMetadata,
    csrfToken: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await request(`/api/v2/datasets/${datasetId}`, {
      method: "PATCH",
      body: JSON.stringify(metadata),
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      signal,
    });

    if (response.status === 401) {
      throw new GeoNodeDatasetIngestionError(
        "session-expired",
        "The GeoNode session expired before metadata could be updated.",
      );
    }

    if (!response.ok) {
      const detail = await responseErrorDetail(response);
      throw new GeoNodeDatasetIngestionError(
        "metadata-update-failed",
        `GeoNode published the dataset but rejected its metadata with status ${response.status}${detail ? `: ${detail}` : "."}`,
      );
    }
  }

  async function uploadDatasetStyle(
    dataset: GeoNodeDataset,
    style: DatasetUploadStyle,
    csrfToken: string,
    signal?: AbortSignal,
  ): Promise<void> {
    let styleFile: File;

    try {
      styleFile = createDatasetStyleFile(dataset, style);
    } catch (error) {
      throw new GeoNodeDatasetIngestionError(
        "style-update-failed",
        error instanceof Error ? error.message : "Dataset style is invalid.",
      );
    }
    const body = new FormData();
    body.set("base_file", styleFile);
    // GeoNode 5.1 selects the SLD handler through base_file, but its style
    // application step reads sld_file from the cloned upload files.
    body.set("sld_file", styleFile);
    body.set("resource_pk", String(dataset.id));
    body.set("action", "resource_style_upload");

    const response = await request("/api/v2/uploads/upload", {
      method: "POST",
      body,
      headers: { "X-CSRFToken": csrfToken },
      signal,
    });

    if (response.status === 401) {
      throw new GeoNodeDatasetIngestionError(
        "session-expired",
        "The GeoNode session expired before the style could be applied.",
      );
    }

    if (!response.ok) {
      const detail = await responseErrorDetail(response);
      throw new GeoNodeDatasetIngestionError(
        "style-update-failed",
        `GeoNode published the dataset but rejected its style with status ${response.status}${detail ? `: ${detail}` : "."}`,
      );
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload) || typeof payload.execution_id !== "string") {
      throw new GeoNodeDatasetIngestionError(
        "style-update-failed",
        "GeoNode returned an invalid style execution response.",
      );
    }

    for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
      if (attempt > 0) {
        await delay(pollIntervalMs, signal);
      }

      const executionResponse = await request(
        executionStatusPath(payload.execution_id, "style-update-failed"),
        { signal },
      );

      if (executionResponse.status === 401) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session expired while the style was being applied.",
        );
      }

      if (!executionResponse.ok) {
        throw new GeoNodeDatasetIngestionError(
          "style-update-failed",
          `GeoNode style execution failed with status ${executionResponse.status}.`,
        );
      }

      const execution = parseExecutionPayload(
        await executionResponse.json(),
        "style-update-failed",
      );

      if (execution.status === "failed") {
        throw new GeoNodeDatasetIngestionError(
          "style-update-failed",
          sanitizeDiagnosticDetail(execution.log) ||
            "GeoNode failed to apply the dataset style.",
        );
      }

      if (execution.status === "finished") {
        return;
      }
    }

    throw new GeoNodeDatasetIngestionError(
      "style-update-failed",
      "GeoNode did not finish applying the dataset style in time.",
    );
  }

  async function retrieveDatasetPermissions(
    datasetId: number,
    signal?: AbortSignal,
  ): Promise<GeoNodeCompactPermissionSpec> {
    const safeDatasetId = requirePositiveInteger(datasetId, "Dataset id");
    const response = await request(
      `/api/v2/resources/${safeDatasetId}/permissions`,
      { signal },
    );

    if (response.status === 401) {
      throw new GeoNodeDatasetIngestionError(
        "session-expired",
        "The GeoNode session expired while dataset permissions were being updated.",
      );
    }
    if (response.status === 403) {
      throw new GeoNodeDatasetIngestionError(
        "permissions-update-failed",
        "GeoNode did not allow this user to manage dataset permissions.",
      );
    }
    if (!response.ok) {
      throw new GeoNodeDatasetIngestionError(
        "permissions-update-failed",
        `GeoNode permission request failed with status ${response.status}.`,
      );
    }

    return parseCompactPermissionSpec(await response.json());
  }

  async function updateDatasetPermissions(
    datasetId: number,
    visibility: DatasetUploadVisibility,
    csrfToken: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const currentPermissions = await retrieveDatasetPermissions(
      datasetId,
      signal,
    );
    const response = await request(
      `/api/v2/resources/${datasetId}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify(permissionPayload(currentPermissions, visibility)),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        signal,
      },
    );

    if (response.status === 401) {
      throw new GeoNodeDatasetIngestionError(
        "session-expired",
        "The GeoNode session expired before dataset permissions could be updated.",
      );
    }
    if (response.status === 403) {
      throw new GeoNodeDatasetIngestionError(
        "permissions-update-failed",
        "GeoNode did not allow this user to manage dataset permissions.",
      );
    }
    if (!response.ok) {
      const detail = await responseErrorDetail(response);
      throw new GeoNodeDatasetIngestionError(
        "permissions-update-failed",
        `GeoNode published the dataset but rejected its permissions with status ${response.status}${detail ? `: ${detail}` : "."}`,
      );
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || typeof payload.execution_id !== "string") {
      throw new GeoNodeDatasetIngestionError(
        "permissions-update-failed",
        "GeoNode returned an invalid permission execution response.",
      );
    }

    for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
      if (attempt > 0) await delay(pollIntervalMs, signal);
      const executionResponse = await request(
        executionStatusPath(payload.execution_id, "permissions-update-failed"),
        { signal },
      );

      if (executionResponse.status === 401) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session expired while dataset permissions were being updated.",
        );
      }
      if (!executionResponse.ok) {
        throw new GeoNodeDatasetIngestionError(
          "permissions-update-failed",
          `GeoNode permission execution failed with status ${executionResponse.status}.`,
        );
      }

      const execution = parseExecutionPayload(
        await executionResponse.json(),
        "permissions-update-failed",
      );
      if (execution.status === "failed") {
        throw new GeoNodeDatasetIngestionError(
          "permissions-update-failed",
          sanitizeDiagnosticDetail(execution.log) ||
            "GeoNode failed to update dataset permissions.",
        );
      }
      if (execution.status === "finished") {
        const confirmedPermissions = await retrieveDatasetPermissions(
          datasetId,
          signal,
        );
        if (!permissionUpdateMatches(confirmedPermissions, visibility)) {
          throw new GeoNodeDatasetIngestionError(
            "permissions-update-failed",
            "GeoNode completed the permission request without applying the selected visibility.",
          );
        }
        return;
      }
    }

    throw new GeoNodeDatasetIngestionError(
      "permissions-update-failed",
      "GeoNode did not finish updating dataset permissions in time.",
    );
  }

  return {
    async exportDatasetFeatures(dataset, { filter, format, signal }) {
      const query = new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: dataset.layerName,
        outputFormat: format === "csv" ? "csv" : "application/json",
        srsName: "EPSG:4326",
      });
      if (filter) {
        query.set("cql_filter", serializeGeoNodeAttributeFilter(filter));
      }
      const response = await request(appendQuery(dataset.wmsUrl, query), {
        signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session cannot export this dataset's features.",
        );
      }
      if (!response.ok) {
        throw new GeoNodeDatasetIngestionError(
          "unexpected-response",
          `GeoServer WFS export failed with status ${response.status}.`,
        );
      }

      return {
        blob: await response.blob(),
        filename: datasetExportFilename(dataset, format),
      };
    },
    getDataset: retrieveDataset,
    async listDatasetFeatures(
      dataset,
      { filter, page = 1, pageSize = 25, signal } = {},
    ) {
      const safePage = clampPositiveInteger(page, 1, Number.MAX_SAFE_INTEGER);
      const safePageSize = clampPositiveInteger(pageSize, 25, 100);
      const query = new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: dataset.layerName,
        outputFormat: "application/json",
        srsName: "EPSG:4326",
        count: String(safePageSize + 1),
        startIndex: String((safePage - 1) * safePageSize),
      });
      if (filter) {
        query.set("cql_filter", serializeGeoNodeAttributeFilter(filter));
      }
      const response = await request(appendQuery(dataset.wmsUrl, query), {
        signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session cannot access this dataset's features.",
        );
      }

      if (!response.ok) {
        throw new GeoNodeDatasetIngestionError(
          "unexpected-response",
          `GeoServer WFS request failed with status ${response.status}.`,
        );
      }

      return parseDatasetFeaturePage(
        await response.json(),
        safePage,
        safePageSize,
      );
    },
    async listDatasets({ page = 1, pageSize = 20, search, signal } = {}) {
      const safePage = clampPositiveInteger(page, 1, Number.MAX_SAFE_INTEGER);
      const safePageSize = clampPositiveInteger(pageSize, 20, 100);
      const query = new URLSearchParams({
        page: String(safePage),
        page_size: String(safePageSize),
      });
      const normalizedSearch = search?.trim().slice(0, maximumSearchLength);

      if (normalizedSearch) {
        query.set("search", normalizedSearch);
        query.append("search_fields", "title");
        query.append("search_fields", "abstract");
      }
      const response = await request(`/api/v2/datasets/?${query}`, { signal });

      if (response.status === 401 || response.status === 403) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session cannot access the dataset catalogue.",
        );
      }

      if (!response.ok) {
        throw new GeoNodeDatasetIngestionError(
          "unexpected-response",
          `GeoNode dataset catalogue request failed with status ${response.status}.`,
        );
      }

      return parseDatasetPage(baseUrl, await response.json());
    },
    async listUserGroups(userId, signal) {
      const safeUserId = requirePositiveInteger(userId, "User id");
      const response = await request(`/api/v2/users/${safeUserId}/groups`, {
        signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session cannot list this user's groups.",
        );
      }
      if (!response.ok) {
        throw new GeoNodeDatasetIngestionError(
          "unexpected-response",
          `GeoNode user groups request failed with status ${response.status}.`,
        );
      }

      return parseUserGroupsPayload(await response.json());
    },
    async uploadDataset(file, options = {}) {
      const { metadata, onProgress, signal, style, visibility } = options;
      const normalizedMetadata = normalizeMetadata(metadata);
      onProgress?.({ stage: "uploading", percentage: 5 });
      const csrfToken = await getCsrfToken(signal);
      const uploadFile = createGeoNodeSafeUploadFile(file);
      const body = new FormData();
      body.set("base_file", uploadFile);
      if (uploadFile.name.endsWith(".zip")) {
        // GeoNode 5.1 uses this marker to inspect the archive and select the
        // Shapefile handler while keeping the archive itself as base_file.
        body.set("zip_file", uploadFile);
      }
      body.set("action", "upload");
      body.set("store_spatial_files", "true");

      const uploadResponse = await request("/api/v2/uploads/upload", {
        method: "POST",
        body,
        headers: { "X-CSRFToken": csrfToken },
        signal,
      });

      if (uploadResponse.status === 401) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session is not authenticated.",
        );
      }

      if (uploadResponse.status === 403) {
        throw new GeoNodeDatasetIngestionError(
          "permission-denied",
          "The GeoNode user does not have permission to upload datasets.",
        );
      }

      if (!uploadResponse.ok) {
        const detail = await responseErrorDetail(uploadResponse);
        throw new GeoNodeDatasetIngestionError(
          "upload-rejected",
          `GeoNode rejected the dataset upload with status ${uploadResponse.status}${detail ? `: ${detail}` : "."}`,
        );
      }

      const uploadPayload: unknown = await uploadResponse.json();

      if (
        !isRecord(uploadPayload) ||
        typeof uploadPayload.execution_id !== "string"
      ) {
        throw new GeoNodeDatasetIngestionError(
          "unexpected-response",
          "GeoNode returned an invalid upload response.",
        );
      }

      onProgress?.({ stage: "processing", percentage: 20 });

      for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
        if (attempt > 0) {
          await delay(pollIntervalMs, signal);
        }

        const executionResponse = await request(
          executionStatusPath(
            uploadPayload.execution_id,
            "unexpected-response",
          ),
          { signal },
        );

        if (
          executionResponse.status === 401 ||
          executionResponse.status === 403
        ) {
          throw new GeoNodeDatasetIngestionError(
            "session-expired",
            "The GeoNode session is not authenticated.",
          );
        }

        if (!executionResponse.ok) {
          throw new GeoNodeDatasetIngestionError(
            "unexpected-response",
            `GeoNode execution request failed with status ${executionResponse.status}.`,
          );
        }

        const execution = parseExecutionPayload(await executionResponse.json());

        if (execution.status === "failed") {
          throw new GeoNodeDatasetIngestionError(
            "processing-failed",
            sanitizeDiagnosticDetail(execution.log) ||
              "GeoNode failed to process the dataset.",
          );
        }

        if (execution.status === "finished") {
          const datasetId = execution.output_params.resources?.[0]?.id;

          if (typeof datasetId !== "number") {
            throw new GeoNodeDatasetIngestionError(
              "unexpected-response",
              "GeoNode completed ingestion without a dataset identifier.",
            );
          }

          onProgress?.({ stage: "retrieving", percentage: 92 });
          let dataset = await retrieveDataset(datasetId, signal);

          if (normalizedMetadata) {
            onProgress?.({ stage: "metadata", percentage: 94 });
            await updateDatasetMetadata(
              datasetId,
              normalizedMetadata,
              csrfToken,
              signal,
            );
            dataset = {
              ...dataset,
              title: normalizedMetadata.title ?? dataset.title,
            };
          }

          if (style) {
            onProgress?.({ stage: "styling", percentage: 96 });
            await uploadDatasetStyle(dataset, style, csrfToken, signal);
          }

          if (normalizedMetadata || style) {
            onProgress?.({ stage: "retrieving", percentage: 97 });
            dataset = await retrieveDataset(datasetId, signal);
          }

          if (visibility) {
            onProgress?.({ stage: "permissions", percentage: 98 });
            await updateDatasetPermissions(
              datasetId,
              visibility,
              csrfToken,
              signal,
            );
          }

          onProgress?.({ stage: "retrieving", percentage: 100 });
          return dataset;
        }

        onProgress?.({
          stage: "processing",
          percentage: Math.min(90, 20 + (attempt + 1) * 2),
        });
      }

      throw new GeoNodeDatasetIngestionError(
        "timeout",
        "GeoNode did not finish dataset ingestion within the expected time.",
      );
    },
  };
}
