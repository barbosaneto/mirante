import type { BaseMapId, MapViewOptions } from "@mirante/sdk";

import {
  serializeGeoNodeAttributeFilter,
  type GeoNodeAttributeFilter,
  type GeoNodeAttributeFilterCondition,
  type GeoNodeAttributeFilterOperator,
  type GeoNodeAttributeType,
} from "./filters";

export interface GeoNodeMapLayerState {
  datasetId: number;
  layerName: string;
  title: string;
  opacity: number;
  visible: boolean;
  order: number;
  filter?: GeoNodeAttributeFilter;
}

export interface GeoNodeMapSummary {
  id: number;
  title: string;
}

export interface GeoNodeSavedMap extends GeoNodeMapSummary {
  baseMap: BaseMapId;
  view: MapViewOptions;
  layers: readonly GeoNodeMapLayerState[];
}

export interface SaveGeoNodeMapInput {
  baseMap: BaseMapId;
  title: string;
  view: MapViewOptions;
  layers: readonly GeoNodeMapLayerState[];
}

export interface GeoNodeMapPage {
  maps: readonly GeoNodeMapSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface GeoNodeMapClient {
  createMap(
    input: SaveGeoNodeMapInput,
    signal?: AbortSignal,
  ): Promise<GeoNodeMapSummary>;
  updateMap(
    id: number,
    input: SaveGeoNodeMapInput,
    signal?: AbortSignal,
  ): Promise<GeoNodeMapSummary>;
  getMap(id: number, signal?: AbortSignal): Promise<GeoNodeSavedMap>;
  listMaps(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    signal?: AbortSignal;
  }): Promise<GeoNodeMapPage>;
}

export type MapPersistenceErrorCode =
  | "csrf-unavailable"
  | "network"
  | "permission-denied"
  | "save-rejected"
  | "session-expired"
  | "unsupported-map"
  | "unexpected-response";

export class GeoNodeMapPersistenceError extends Error {
  readonly code: MapPersistenceErrorCode;

  constructor(code: MapPersistenceErrorCode, message: string) {
    super(message);
    this.name = "GeoNodeMapPersistenceError";
    this.code = code;
  }
}

interface CreateGeoNodeMapClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl === "/" || baseUrl === "") return path;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function parseCsrfToken(html: string): string {
  const match = html.match(
    /name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/,
  );

  if (!match?.[1]) {
    throw new GeoNodeMapPersistenceError(
      "csrf-unavailable",
      "GeoNode did not provide a CSRF token.",
    );
  }

  return match[1];
}

function parseId(value: unknown): number | null {
  const id = typeof value === "string" ? Number(value) : value;
  return typeof id === "number" && Number.isInteger(id) ? id : null;
}

function parseSummary(value: unknown): GeoNodeMapSummary {
  if (!isRecord(value)) {
    throw new GeoNodeMapPersistenceError(
      "unexpected-response",
      "GeoNode returned an invalid map.",
    );
  }

  const id = parseId(value.pk ?? value.id);
  if (id === null || typeof value.title !== "string") {
    throw new GeoNodeMapPersistenceError(
      "unexpected-response",
      "GeoNode returned incomplete map metadata.",
    );
  }

  return { id, title: value.title };
}

function parseView(data: Record<string, unknown>): MapViewOptions | null {
  const map = data.map;
  if (!isRecord(map) || !isRecord(map.center)) return null;
  const { x, y } = map.center;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof map.zoom !== "number"
  )
    return null;
  return { center: [x, y], zoom: map.zoom };
}

const filterTypes = new Set<GeoNodeAttributeType>(["date", "number", "text"]);
const filterOperators = new Set<GeoNodeAttributeFilterOperator>([
  "contains",
  "equals",
  "greater-or-equal",
  "greater-than",
  "less-or-equal",
  "less-than",
  "not-equals",
]);

function parseFilterCondition(
  value: unknown,
): GeoNodeAttributeFilterCondition | undefined {
  if (
    !isRecord(value) ||
    typeof value.field !== "string" ||
    typeof value.type !== "string" ||
    typeof value.operator !== "string" ||
    typeof value.value !== "string" ||
    !filterTypes.has(value.type as GeoNodeAttributeType) ||
    !filterOperators.has(value.operator as GeoNodeAttributeFilterOperator)
  ) {
    return undefined;
  }

  const filter: GeoNodeAttributeFilterCondition = {
    field: value.field,
    type: value.type as GeoNodeAttributeType,
    operator: value.operator as GeoNodeAttributeFilterOperator,
    value: value.value,
  };

  try {
    serializeGeoNodeAttributeFilter(filter);
    return filter;
  } catch {
    return undefined;
  }
}

function parseFilter(value: unknown): GeoNodeAttributeFilter | undefined {
  const condition = parseFilterCondition(value);
  if (condition) return condition;

  if (
    !isRecord(value) ||
    (value.combinator !== "and" && value.combinator !== "or") ||
    !Array.isArray(value.conditions)
  ) {
    return undefined;
  }

  const conditions = value.conditions
    .map(parseFilterCondition)
    .filter(
      (item): item is GeoNodeAttributeFilterCondition => item !== undefined,
    );
  if (conditions.length !== value.conditions.length || conditions.length === 0)
    return undefined;

  const filter: GeoNodeAttributeFilter = {
    combinator: value.combinator,
    conditions,
  };
  try {
    serializeGeoNodeAttributeFilter(filter);
    return filter;
  } catch {
    return undefined;
  }
}

function parseLayer(
  value: unknown,
  fallbackOrder: number,
): GeoNodeMapLayerState | null {
  if (!isRecord(value)) return null;
  const dataset = value.dataset;
  const datasetId = parseId(
    value.datasetId ?? (isRecord(dataset) ? (dataset.pk ?? dataset.id) : null),
  );
  const layerName =
    typeof value.layerName === "string"
      ? value.layerName
      : typeof value.name === "string"
        ? value.name
        : null;
  const title =
    typeof value.title === "string"
      ? value.title
      : isRecord(dataset) && typeof dataset.title === "string"
        ? dataset.title
        : layerName;
  const opacity =
    typeof value.opacity === "number"
      ? Math.max(0, Math.min(1, value.opacity))
      : 1;
  const order = typeof value.order === "number" ? value.order : fallbackOrder;
  const filter = parseFilter(value.filter);

  if (datasetId === null || !layerName || !title) return null;
  return {
    datasetId,
    layerName,
    title,
    opacity,
    visible: value.visible !== false && value.visibility !== false,
    order,
    ...(filter ? { filter } : {}),
  };
}

function parseSavedMap(value: unknown): GeoNodeSavedMap {
  if (!isRecord(value) || !isRecord(value.map)) {
    throw new GeoNodeMapPersistenceError(
      "unexpected-response",
      "GeoNode returned an invalid map response.",
    );
  }

  const summary = parseSummary(value.map);
  const data = isRecord(value.map.data) ? value.map.data : null;
  const view = data ? parseView(data) : null;
  const mirante = data && isRecord(data.mirante) ? data.mirante : null;
  const baseMap =
    mirante && typeof mirante.baseMap === "string" && mirante.baseMap.trim()
      ? mirante.baseMap
      : "open-street-map";
  const customLayers =
    mirante && Array.isArray(mirante.layers) ? mirante.layers : null;
  const standardLayers = Array.isArray(value.map.maplayers)
    ? value.map.maplayers
    : [];
  const sourceLayers = customLayers ?? standardLayers;
  const layers = sourceLayers
    .map((layer, index) => parseLayer(layer, index))
    .filter((layer): layer is GeoNodeMapLayerState => layer !== null)
    .sort((first, second) => first.order - second.order);

  if (!view) {
    throw new GeoNodeMapPersistenceError(
      "unsupported-map",
      "The GeoNode map does not contain a recoverable geographic view.",
    );
  }

  return { ...summary, baseMap, view, layers };
}

function createMapData(input: SaveGeoNodeMapInput): Record<string, unknown> {
  return {
    map: {
      zoom: input.view.zoom,
      units: "m",
      center: {
        x: input.view.center[0],
        y: input.view.center[1],
        crs: "EPSG:4326",
      },
      groups: [{ id: "Default", title: "Default", expanded: true }],
      layers: input.layers.map((layer) => ({
        id: `mirante-dataset-${layer.datasetId}`,
        name: layer.layerName,
        type: "wms",
        group: "Default",
        title: layer.title,
        visibility: layer.visible,
        opacity: layer.opacity,
        extraParams: {
          msId: `mirante-dataset-${layer.datasetId}`,
          ...(layer.filter
            ? { CQL_FILTER: serializeGeoNodeAttributeFilter(layer.filter) }
            : {}),
        },
      })),
      projection: "EPSG:3857",
      backgrounds: [],
    },
    version: 4,
    mirante: {
      version: 4,
      baseMap: input.baseMap,
      layers: input.layers.map((layer) => ({
        datasetId: layer.datasetId,
        layerName: layer.layerName,
        title: layer.title,
        opacity: layer.opacity,
        visible: layer.visible,
        order: layer.order,
        ...(layer.filter ? { filter: layer.filter } : {}),
      })),
    },
  };
}

export function createGeoNodeMapClient({
  baseUrl,
  fetch: fetchImplementation = globalThis.fetch,
}: CreateGeoNodeMapClientOptions): GeoNodeMapClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetchImplementation(joinUrl(baseUrl, path), {
        ...init,
        credentials: "include",
        headers: { Accept: "application/json, text/html", ...init?.headers },
      });
    } catch (error) {
      if (init?.signal?.aborted) throw error;
      throw new GeoNodeMapPersistenceError(
        "network",
        `GeoNode request failed: ${error instanceof Error ? error.message : "unknown network error"}`,
      );
    }
  }

  async function getCsrfToken(signal?: AbortSignal): Promise<string> {
    const response = await request("/account/logout/", { signal });
    if (!response.ok) {
      throw new GeoNodeMapPersistenceError(
        "csrf-unavailable",
        `GeoNode CSRF request failed with status ${response.status}.`,
      );
    }
    return parseCsrfToken(await response.text());
  }

  function createMapPayload(input: SaveGeoNodeMapInput) {
    return {
      title: input.title.trim(),
      data: createMapData(input),
      maplayers: input.layers.map((layer) => ({
        name: layer.layerName,
        order: layer.order,
        opacity: layer.opacity,
        visibility: layer.visible,
        extra_params: {
          msId: `mirante-dataset-${layer.datasetId}`,
          ...(layer.filter
            ? { CQL_FILTER: serializeGeoNodeAttributeFilter(layer.filter) }
            : {}),
        },
      })),
    };
  }

  async function saveMap(
    path: string,
    method: "PATCH" | "POST",
    input: SaveGeoNodeMapInput,
    signal?: AbortSignal,
  ): Promise<GeoNodeMapSummary> {
    const csrfToken = await getCsrfToken(signal);
    const response = await request(path, {
      method,
      body: JSON.stringify(createMapPayload(input)),
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      signal,
    });
    if (response.status === 401)
      throw new GeoNodeMapPersistenceError(
        "session-expired",
        "The GeoNode session has expired.",
      );
    if (response.status === 403)
      throw new GeoNodeMapPersistenceError(
        "permission-denied",
        "The GeoNode user cannot save this map.",
      );
    if (!response.ok)
      throw new GeoNodeMapPersistenceError(
        "save-rejected",
        `GeoNode rejected the map with status ${response.status}.`,
      );
    const payload: unknown = await response.json();
    if (!isRecord(payload) || !("map" in payload))
      throw new GeoNodeMapPersistenceError(
        "unexpected-response",
        "GeoNode returned an invalid map save response.",
      );
    return parseSummary(payload.map);
  }

  return {
    async createMap(input, signal) {
      return saveMap("/api/v2/maps?include[]=data", "POST", input, signal);
    },
    async updateMap(id, input, signal) {
      return saveMap(
        `/api/v2/maps/${id}?include[]=data`,
        "PATCH",
        input,
        signal,
      );
    },
    async getMap(id, signal) {
      const response = await request(`/api/v2/maps/${id}?include[]=data`, {
        signal,
      });
      if (response.status === 401 || response.status === 403)
        throw new GeoNodeMapPersistenceError(
          "session-expired",
          "The GeoNode map is not accessible in this session.",
        );
      if (!response.ok)
        throw new GeoNodeMapPersistenceError(
          "unexpected-response",
          `GeoNode map request failed with status ${response.status}.`,
        );
      return parseSavedMap(await response.json());
    },
    async listMaps({ page = 1, pageSize = 10, search, signal } = {}) {
      const query = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (search?.trim()) {
        query.set("search", search.trim());
        query.set("search_fields", "title");
      }
      const response = await request(`/api/v2/maps?${query}`, { signal });
      if (response.status === 401 || response.status === 403)
        throw new GeoNodeMapPersistenceError(
          "session-expired",
          "The GeoNode map catalogue is not accessible in this session.",
        );
      if (!response.ok)
        throw new GeoNodeMapPersistenceError(
          "unexpected-response",
          `GeoNode map catalogue request failed with status ${response.status}.`,
        );
      const payload: unknown = await response.json();
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.maps) ||
        typeof payload.total !== "number" ||
        typeof payload.page !== "number" ||
        typeof payload.page_size !== "number"
      ) {
        throw new GeoNodeMapPersistenceError(
          "unexpected-response",
          "GeoNode returned an invalid map catalogue response.",
        );
      }
      return {
        maps: payload.maps.map(parseSummary),
        total: payload.total,
        page: payload.page,
        pageSize: payload.page_size,
      };
    },
  };
}
