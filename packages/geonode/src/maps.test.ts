import { describe, expect, it, vi } from "vitest";

import { createGeoNodeMapClient, GeoNodeMapPersistenceError } from "./maps";

function csrfResponse(): Response {
  return new Response('<input name="csrfmiddlewaretoken" value="csrf-token">');
}

describe("GeoNode map client", () => {
  it("creates a map through the vanilla GeoNode API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json(
          { map: { pk: 12, title: "Field survey" } },
          { status: 201 },
        ),
      );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(
      client.createMap({
        title: " Field survey ",
        view: { center: [-47.9, -15.8], zoom: 8 },
        layers: [
          {
            datasetId: 7,
            layerName: "geonode:municipal_boundaries",
            title: "Municipal boundaries",
            opacity: 0.6,
            visible: false,
            order: 0,
          },
        ],
      }),
    ).resolves.toEqual({ id: 12, title: "Field survey" });

    const request = fetchMock.mock.calls[1];
    expect(request?.[0]).toBe("/api/v2/maps?include[]=data");
    expect(request?.[1]).toMatchObject({ method: "POST" });
    const requestBody = request?.[1]?.body;
    expect(typeof requestBody).toBe("string");
    const body = JSON.parse(requestBody as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      title: "Field survey",
      data: {
        map: { zoom: 8, center: { x: -47.9, y: -15.8, crs: "EPSG:4326" } },
        mirante: {
          version: 1,
          layers: [{ datasetId: 7, opacity: 0.6, visible: false }],
        },
      },
      maplayers: [
        {
          name: "geonode:municipal_boundaries",
          opacity: 0.6,
          visibility: false,
          order: 0,
        },
      ],
    });
  });

  it("lists accessible GeoNode maps", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        total: 2,
        page: 1,
        page_size: 50,
        maps: [
          { pk: "12", title: "Field survey" },
          { pk: 13, title: "Watersheds" },
        ],
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(client.listMaps()).resolves.toEqual({
      maps: [
        { id: 12, title: "Field survey" },
        { id: 13, title: "Watersheds" },
      ],
      total: 2,
      page: 1,
      pageSize: 50,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/maps?page=1&page_size=50",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("recovers view and layer state from a Mirante map", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        map: {
          pk: 12,
          title: "Field survey",
          data: {
            map: { zoom: 8, center: { x: -47.9, y: -15.8, crs: "EPSG:4326" } },
            mirante: {
              version: 1,
              layers: [
                {
                  datasetId: 7,
                  layerName: "geonode:municipal_boundaries",
                  title: "Municipal boundaries",
                  opacity: 0.6,
                  visible: false,
                  order: 0,
                },
              ],
            },
          },
          maplayers: [],
        },
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(client.getMap(12)).resolves.toMatchObject({
      id: 12,
      title: "Field survey",
      view: { center: [-47.9, -15.8], zoom: 8 },
      layers: [{ datasetId: 7, opacity: 0.6, visible: false }],
    });
  });

  it("falls back to standard maplayers from maps created in GeoNode", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        map: {
          pk: 14,
          title: "GeoNode map",
          data: {
            map: { zoom: 5, center: { x: -52, y: -14, crs: "EPSG:4326" } },
          },
          maplayers: [
            {
              dataset: { pk: "9", title: "States" },
              name: "geonode:states",
              opacity: 0.75,
              visibility: true,
              order: 2,
            },
          ],
        },
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(client.getMap(14)).resolves.toMatchObject({
      layers: [{ datasetId: 9, layerName: "geonode:states", title: "States" }],
    });
  });

  it("rejects maps without a recoverable view", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        map: { pk: 15, title: "Broken map", data: {}, maplayers: [] },
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(client.getMap(15)).rejects.toEqual(
      new GeoNodeMapPersistenceError(
        "unsupported-map",
        "The GeoNode map does not contain a recoverable geographic view.",
      ),
    );
  });
});
