import { describe, expect, it, vi } from "vitest";

import {
  createGeoNodeDatasetClient,
  GeoNodeDatasetIngestionError,
} from "./datasets";

function csrfResponse(): Response {
  return new Response('<input name="csrfmiddlewaretoken" value="csrf-token">', {
    status: 200,
  });
}

describe("GeoNode dataset client", () => {
  it("uploads, follows execution, and retrieves a vanilla GeoNode dataset", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ execution_id: "execution-1" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { status: "running", log: null, output_params: {} },
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            status: "finished",
            log: null,
            output_params: { resources: [{ id: 42 }] },
          },
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            dataset: {
              pk: "42",
              title: "Conservation areas",
              alternate: "geonode:conservation_areas",
              dataset_ows_url:
                "http://localhost:8000/geoserver/geonode/conservation_areas/ows",
              extent: {
                coords: [-54, -16, -45, -8],
                srid: "EPSG:4326",
              },
            },
          },
          { status: 200 },
        ),
      );
    const progress = vi.fn();
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
      pollIntervalMs: 0,
    });
    const file = new File(
      [JSON.stringify({ type: "FeatureCollection", features: [] })],
      "areas.geojson",
    );

    await expect(
      client.uploadDataset(file, { onProgress: progress }),
    ).resolves.toEqual({
      id: 42,
      title: "Conservation areas",
      layerName: "geonode:conservation_areas",
      wmsUrl: "/geoserver/geonode/conservation_areas/ows",
      extent: [-54, -16, -45, -8],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/account/logout/",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v2/uploads/upload",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v2/datasets/42",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(progress).toHaveBeenLastCalledWith({
      stage: "retrieving",
      percentage: 100,
    });
  });

  it("reports a failed asynchronous execution", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ execution_id: "execution-2" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            status: "failed",
            log: "Import failed",
            output_params: {},
          },
          { status: 200 },
        ),
      );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
      pollIntervalMs: 0,
    });

    await expect(
      client.uploadDataset(new File(["{}"], "invalid.geojson")),
    ).rejects.toEqual(
      new GeoNodeDatasetIngestionError("processing-failed", "Import failed"),
    );
  });

  it("marks a ZIP upload so vanilla GeoNode selects the Shapefile handler", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ execution_id: "execution-zip" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            status: "failed",
            log: "Test stopped after multipart validation",
            output_params: {},
          },
          { status: 200 },
        ),
      );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
      pollIntervalMs: 0,
    });
    const file = new File(["PK\u0003\u0004"], "boundaries.zip", {
      type: "application/zip",
    });

    await expect(client.uploadDataset(file)).rejects.toMatchObject({
      code: "processing-failed",
    });

    const request = fetchMock.mock.calls[1]?.[1];
    expect(request?.body).toBeInstanceOf(FormData);
    const body = request?.body as FormData;
    expect(body.get("base_file")).toBe(file);
    expect(body.get("zip_file")).toBe(file);
  });

  it("preserves the GeoNode rejection detail", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json(
          { detail: "Invalid or unsafe ZIP archive." },
          { status: 400 },
        ),
      );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    await expect(
      client.uploadDataset(new File(["PK"], "invalid.zip")),
    ).rejects.toMatchObject({
      code: "upload-rejected",
      message:
        "GeoNode rejected the dataset upload with status 400: Invalid or unsafe ZIP archive.",
    });
  });
});
