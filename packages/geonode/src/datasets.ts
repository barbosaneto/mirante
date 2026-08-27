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

export interface ListGeoNodeDatasetsOptions {
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export type DatasetIngestionStage = "uploading" | "processing" | "retrieving";

export interface DatasetIngestionProgress {
  stage: DatasetIngestionStage;
  percentage: number;
}

export type DatasetIngestionErrorCode =
  | "csrf-unavailable"
  | "network"
  | "processing-failed"
  | "session-expired"
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
  onProgress?: (progress: DatasetIngestionProgress) => void;
  signal?: AbortSignal;
}

export interface GeoNodeDatasetClient {
  listDatasets(
    options?: ListGeoNodeDatasetsOptions,
  ): Promise<GeoNodeDatasetPage>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl === "/" || baseUrl === "") {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
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

function parseExecutionPayload(value: unknown): ExecutionPayload {
  if (
    !isRecord(value) ||
    !["failed", "finished", "ready", "running"].includes(
      String(value.status),
    ) ||
    !(value.log === null || typeof value.log === "string") ||
    !isRecord(value.output_params)
  ) {
    throw new GeoNodeDatasetIngestionError(
      "unexpected-response",
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
    !extent.coords.every((coordinate) => typeof coordinate === "number")
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
    !extent.coords.every((coordinate) => typeof coordinate === "number")
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
      return payload.detail;
    }
  } catch {
    // The response is not JSON; try its text representation below.
  }

  try {
    const detail = (await response.text()).trim();
    return detail || null;
  } catch {
    return null;
  }
}

export function createGeoNodeDatasetClient({
  baseUrl,
  fetch: fetchImplementation = globalThis.fetch,
  pollIntervalMs = 1_000,
  maxPollAttempts = 300,
}: CreateDatasetClientOptions): GeoNodeDatasetClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetchImplementation(joinUrl(baseUrl, path), {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json, text/html",
          ...init?.headers,
        },
      });
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
    const response = await request(`/api/v2/datasets/${datasetId}`, { signal });

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

  return {
    async listDatasets({ page = 1, pageSize = 20, signal } = {}) {
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
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
    async uploadDataset(file, options = {}) {
      const { onProgress, signal } = options;
      onProgress?.({ stage: "uploading", percentage: 5 });
      const csrfToken = await getCsrfToken(signal);
      const body = new FormData();
      body.set("base_file", file);
      if (file.name.toLowerCase().endsWith(".zip")) {
        // GeoNode 5.1 uses this marker to inspect the archive and select the
        // Shapefile handler while keeping the archive itself as base_file.
        body.set("zip_file", file);
      }
      body.set("action", "upload");
      body.set("store_spatial_files", "true");

      const uploadResponse = await request("/api/v2/uploads/upload", {
        method: "POST",
        body,
        headers: { "X-CSRFToken": csrfToken },
        signal,
      });

      if (uploadResponse.status === 401 || uploadResponse.status === 403) {
        throw new GeoNodeDatasetIngestionError(
          "session-expired",
          "The GeoNode session is not authenticated.",
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
          `/api/v2/resource-service/execution-status/${uploadPayload.execution_id}`,
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
            execution.log || "GeoNode failed to process the dataset.",
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

          onProgress?.({ stage: "retrieving", percentage: 95 });
          const dataset = await retrieveDataset(datasetId, signal);
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
