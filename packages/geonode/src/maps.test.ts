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
        baseMap: "dark-matter",
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
            filter: {
              field: "status",
              operator: "equals",
              type: "text",
              value: "approved",
            },
          },
        ],
      }),
    ).resolves.toEqual({
      id: 12,
      title: "Field survey",
      permissions: [],
      canEdit: true,
      canManage: false,
    });

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
          version: 4,
          baseMap: "dark-matter",
          layers: [
            {
              datasetId: 7,
              opacity: 0.6,
              visible: false,
              filter: {
                field: "status",
                operator: "equals",
                type: "text",
                value: "approved",
              },
            },
          ],
        },
      },
      maplayers: [
        {
          name: "geonode:municipal_boundaries",
          opacity: 0.6,
          visibility: false,
          order: 0,
          extra_params: {
            msId: "mirante-dataset-7",
            CQL_FILTER: "\"status\" = 'approved'",
          },
        },
      ],
    });
  });

  it("persists and restores compound layer filters", async () => {
    const compoundFilter = {
      combinator: "or" as const,
      conditions: [
        {
          field: "status",
          operator: "equals" as const,
          type: "text" as const,
          value: "approved",
        },
        {
          field: "population",
          operator: "greater-than" as const,
          type: "number" as const,
          value: "1000",
        },
      ],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ map: { pk: 21, title: "Filtered map" } }),
      )
      .mockResolvedValueOnce(
        Response.json({
          map: {
            pk: 21,
            title: "Filtered map",
            data: {
              map: { zoom: 6, center: { x: -50, y: -15 } },
              mirante: {
                version: 3,
                layers: [
                  {
                    datasetId: 7,
                    layerName: "geonode:municipal_boundaries",
                    title: "Municipal boundaries",
                    opacity: 1,
                    visible: true,
                    order: 0,
                    filter: compoundFilter,
                  },
                ],
              },
            },
            maplayers: [],
          },
        }),
      );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await client.createMap({
      baseMap: "open-street-map",
      title: "Filtered map",
      view: { center: [-50, -15], zoom: 6 },
      layers: [
        {
          datasetId: 7,
          layerName: "geonode:municipal_boundaries",
          title: "Municipal boundaries",
          opacity: 1,
          visible: true,
          order: 0,
          filter: compoundFilter,
        },
      ],
    });

    const requestBody = fetchMock.mock.calls[1]?.[1]?.body;
    const body = JSON.parse(requestBody as string) as {
      maplayers: Array<{ extra_params: { CQL_FILTER: string } }>;
    };
    expect(body.maplayers[0]?.extra_params.CQL_FILTER).toBe(
      '("status" = \'approved\') OR ("population" > 1000)',
    );
    await expect(client.getMap(21)).resolves.toMatchObject({
      layers: [{ filter: compoundFilter }],
    });
  });

  it("lists accessible GeoNode maps", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        total: 2,
        page: 1,
        page_size: 10,
        maps: [
          {
            pk: "12",
            title: "Field survey",
            owner: { pk: 7 },
            perms: ["view_resourcebase", "change_resourcebase"],
          },
          { pk: 13, title: "Watersheds", perms: ["view_resourcebase"] },
        ],
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(client.listMaps()).resolves.toEqual({
      maps: [
        {
          id: 12,
          title: "Field survey",
          ownerId: 7,
          permissions: ["view_resourcebase", "change_resourcebase"],
          canEdit: true,
          canManage: false,
        },
        {
          id: 13,
          title: "Watersheds",
          permissions: ["view_resourcebase"],
          canEdit: false,
          canManage: false,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/maps?page=1&page_size=10",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("searches and paginates maps through the GeoNode API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        total: 1,
        page: 2,
        page_size: 8,
        maps: [{ pk: 12, title: "Field survey" }],
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await client.listMaps({ page: 2, pageSize: 8, search: " Field " });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/maps?page=2&page_size=8&search=Field&search_fields=title",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("updates an existing map through the vanilla GeoNode API", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(
        Response.json({ map: { pk: 12, title: "Field survey" } }),
      );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(
      client.updateMap(12, {
        baseMap: "open-street-map",
        title: "Field survey",
        view: { center: [-47.9, -15.8], zoom: 8 },
        layers: [],
      }),
    ).resolves.toEqual({
      id: 12,
      title: "Field survey",
      permissions: [],
      canEdit: true,
      canManage: false,
    });

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/v2/maps/12?include[]=data");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
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
                  filter: {
                    field: "name",
                    operator: "contains",
                    type: "text",
                    value: "Municipal",
                  },
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
      baseMap: "open-street-map",
      id: 12,
      title: "Field survey",
      view: { center: [-47.9, -15.8], zoom: 8 },
      layers: [
        {
          datasetId: 7,
          opacity: 0.6,
          visible: false,
          filter: {
            field: "name",
            operator: "contains",
            type: "text",
            value: "Municipal",
          },
        },
      ],
    });
  });

  it("derives edit and management capabilities from map permissions", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({
        map: {
          pk: 18,
          title: "Managed map",
          owner: { pk: 44 },
          perms: [
            "view_resourcebase",
            "change_resourcebase",
            "change_resourcebase_permissions",
          ],
          data: {
            map: { zoom: 5, center: { x: -52, y: -14 } },
            mirante: { layers: [] },
          },
          maplayers: [],
        },
      }),
    );
    const client = createGeoNodeMapClient({ baseUrl: "/", fetch: fetchMock });

    await expect(client.getMap(18)).resolves.toMatchObject({
      ownerId: 44,
      permissions: [
        "view_resourcebase",
        "change_resourcebase",
        "change_resourcebase_permissions",
      ],
      canEdit: true,
      canManage: true,
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
