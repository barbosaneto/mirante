export interface DatasetFeatureInfo {
  datasetId: number;
  datasetTitle: string;
  featureId?: string;
  geometry?: Readonly<Record<string, unknown>>;
  attributes: Readonly<Record<string, unknown>>;
}

const maximumFeatureInfoResults = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseWmsFeatureInfo(
  datasetId: number,
  datasetTitle: string,
  payload: unknown,
): DatasetFeatureInfo[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    throw new Error("The WMS server returned an invalid feature response.");
  }

  return payload.features
    .slice(0, maximumFeatureInfoResults)
    .flatMap((feature) => {
      if (!isRecord(feature) || !isRecord(feature.properties)) {
        return [];
      }

      const rawFeatureId = feature.id;
      const featureId =
        typeof rawFeatureId === "string" || typeof rawFeatureId === "number"
          ? String(rawFeatureId)
          : undefined;
      const geometry = isRecord(feature.geometry)
        ? feature.geometry
        : undefined;

      return [
        {
          datasetId,
          datasetTitle,
          ...(featureId ? { featureId } : {}),
          ...(geometry ? { geometry } : {}),
          attributes: feature.properties,
        },
      ];
    });
}
