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

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return text."));
      }
    });
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("FileReader failed.")),
    );
    reader.readAsText(file);
  });
}

describe("GeoNode dataset client", () => {
  it("lists published datasets from the vanilla GeoNode catalogue", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        total: 2,
        page: 1,
        page_size: 20,
        datasets: [
          {
            pk: "7",
            title: "Municipal boundaries",
            alternate: "geonode:municipal_boundaries",
            is_published: true,
            processed: true,
            extent: {
              coords: [-54, -16, -45, -8],
              srid: "EPSG:4326",
            },
          },
          {
            pk: "8",
            title: "Still processing",
            alternate: "geonode:still_processing",
            is_published: true,
            processed: false,
            extent: {
              coords: [-54, -16, -45, -8],
              srid: "EPSG:4326",
            },
          },
        ],
      }),
    );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    await expect(client.listDatasets()).resolves.toEqual({
      datasets: [
        {
          id: 7,
          title: "Municipal boundaries",
          layerName: "geonode:municipal_boundaries",
          wmsUrl: "/geoserver/ows",
          extent: [-54, -16, -45, -8],
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/datasets/?page=1&page_size=20",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("searches dataset titles and descriptions through the vanilla API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        total: 0,
        page: 1,
        page_size: 20,
        datasets: [],
      }),
    );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    await expect(
      client.listDatasets({ search: "  protected areas  " }),
    ).resolves.toMatchObject({ total: 0, datasets: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/datasets/?page=1&page_size=20&search=protected+areas&search_fields=title&search_fields=abstract",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("lists a paginated attribute page through vanilla GeoServer WFS", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        type: "FeatureCollection",
        numberMatched: 26,
        numberReturned: 1,
        features: [
          {
            type: "Feature",
            id: "municipal_boundaries.26",
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-48.2, -16.1],
                  [-47.8, -16.1],
                  [-47.8, -15.7],
                  [-48.2, -16.1],
                ],
              ],
            },
            properties: { name: "Brasília", population: 2_817_381 },
          },
        ],
      }),
    );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    await expect(
      client.listDatasetFeatures(
        {
          id: 7,
          title: "Municipal boundaries",
          layerName: "geonode:municipal_boundaries",
          wmsUrl: "/geoserver/ows",
          extent: [-54, -16, -45, -8],
        },
        {
          filter: {
            field: "name",
            operator: "contains",
            type: "text",
            value: "Brasília",
          },
          page: 2,
          pageSize: 25,
        },
      ),
    ).resolves.toEqual({
      features: [
        {
          id: "municipal_boundaries.26",
          attributes: { name: "Brasília", population: 2_817_381 },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-48.2, -16.1],
                [-47.8, -16.1],
                [-47.8, -15.7],
                [-48.2, -16.1],
              ],
            ],
          },
          extent: [-48.2, -16.1, -47.8, -15.7],
        },
      ],
      hasNext: false,
      page: 2,
      pageSize: 25,
      total: 26,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=geonode%3Amunicipal_boundaries&outputFormat=application%2Fjson&srsName=EPSG%3A4326&count=26&startIndex=25&cql_filter=%22name%22+ILIKE+%27%25Bras%C3%ADlia%25%27",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      credentials: "include",
      headers: { Accept: "application/json, text/html" },
    });
  });

  it("exports every filtered feature through vanilla GeoServer WFS", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response('name,population\n"Brasília",2817381', {
        headers: { "Content-Type": "text/csv" },
      }),
    );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    const result = await client.exportDatasetFeatures(
      {
        id: 7,
        title: "Limites municipais",
        layerName: "geonode:municipal_boundaries",
        wmsUrl: "/geoserver/ows",
        extent: [-54, -16, -45, -8],
      },
      {
        format: "csv",
        filter: {
          field: "name",
          operator: "contains",
          type: "text",
          value: "Brasília",
        },
      },
    );

    expect(result.filename).toBe("limites-municipais.csv");
    expect(await result.blob.text()).toBe(
      'name,population\n"Brasília",2817381',
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=geonode%3Amunicipal_boundaries&outputFormat=csv&srsName=EPSG%3A4326&cql_filter=%22name%22+ILIKE+%27%25Bras%C3%ADlia%25%27",
    );
  });

  it("requests GeoJSON when exporting spatial features", async () => {
    const featureCollection = { type: "FeatureCollection", features: [] };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(featureCollection));
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    const result = await client.exportDatasetFeatures(
      {
        id: 7,
        title: "Municipal boundaries",
        layerName: "geonode:municipal_boundaries",
        wmsUrl: "/geoserver/ows",
        extent: [-54, -16, -45, -8],
      },
      { format: "geojson" },
    );

    expect(result.filename).toBe("municipal-boundaries.geojson");
    expect(JSON.parse(await result.blob.text())).toEqual(featureCollection);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "outputFormat=application%2Fjson",
    );
  });

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

  it("applies optional metadata and a persistent SLD style after ingestion", async () => {
    const initialDataset = {
      dataset: {
        pk: "42",
        title: "areas",
        alternate: "geonode:areas",
        dataset_ows_url: "http://localhost:8000/geoserver/ows",
        extent: {
          coords: [-54, -16, -45, -8],
          srid: "EPSG:4326",
        },
      },
    };
    const finalDataset = {
      dataset: {
        ...initialDataset.dataset,
        title: "Conservation areas",
      },
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ execution_id: "dataset-execution" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "finished",
          log: null,
          output_params: { resources: [{ id: 42 }] },
        }),
      )
      .mockResolvedValueOnce(Response.json(initialDataset))
      .mockResolvedValueOnce(Response.json(finalDataset))
      .mockResolvedValueOnce(
        Response.json({ execution_id: "style-execution" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "finished",
          log: null,
          output_params: { resources: [{ id: 42 }] },
        }),
      )
      .mockResolvedValueOnce(Response.json(finalDataset));
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
      pollIntervalMs: 0,
    });
    const file = new File(["{}"], "areas.geojson");

    await expect(
      client.uploadDataset(file, {
        metadata: {
          title: "  Conservation areas  ",
          abstract: "Protected territories",
        },
        style: {
          geometry: "polygon",
          fillColor: "#14b8a6",
          strokeColor: "#0f172a",
        },
      }),
    ).resolves.toMatchObject({ title: "Conservation areas" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/v2/datasets/42",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Conservation areas",
          abstract: "Protected territories",
        }),
      }),
    );
    const styleRequest = fetchMock.mock.calls[5]?.[1];
    expect(styleRequest?.body).toBeInstanceOf(FormData);
    const styleBody = styleRequest?.body as FormData;
    expect(styleBody.get("action")).toBe("resource_style_upload");
    expect(styleBody.get("resource_pk")).toBe("42");
    const styleFile = styleBody.get("base_file") as File;
    expect(styleBody.get("sld_file")).toBe(styleFile);
    expect(styleFile.name).toBe("mirante-42.sld");
    await expect(readFile(styleFile)).resolves.toContain(
      "<sld:PolygonSymbolizer>",
    );
    await expect(readFile(styleFile)).resolves.toContain("#14b8a6");
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

  it("normalizes Unicode filenames before handing them to GeoNode storage", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ execution_id: "execution-safe-name" }, { status: 201 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "failed",
          log: "Test stopped after filename validation",
          output_params: {},
        }),
      );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
      pollIntervalMs: 0,
    });
    const file = new File(
      ["dataset-content"],
      "a\u0301reas protegidas.geojson",
      {
        type: "application/geo+json",
        lastModified: 123,
      },
    );

    await expect(client.uploadDataset(file)).rejects.toMatchObject({
      code: "processing-failed",
    });

    const request = fetchMock.mock.calls[1]?.[1];
    const body = request?.body as FormData;
    const uploadedFile = body.get("base_file") as File;
    expect(uploadedFile.name).toBe("areas-protegidas.geojson");
    expect(uploadedFile.type).toBe(file.type);
    expect(uploadedFile.lastModified).toBe(file.lastModified);
    await expect(readFile(uploadedFile)).resolves.toBe("dataset-content");
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

  it("does not expose a GeoNode debug HTML page as an upload detail", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        new Response(
          "<!DOCTYPE html><html><body>Internal traceback</body></html>",
          {
            status: 500,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        ),
      );
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    await expect(
      client.uploadDataset(new File(["{}"], "dataset.geojson")),
    ).rejects.toMatchObject({
      code: "upload-rejected",
      message: "GeoNode rejected the dataset upload with status 500.",
    });
  });

  it("reports permission denial separately from an expired session", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(new Response(null, { status: 403 }));
    const client = createGeoNodeDatasetClient({
      baseUrl: "/",
      fetch: fetchMock,
    });

    await expect(
      client.uploadDataset(new File(["{}"], "dataset.geojson")),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });
});
