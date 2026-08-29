import { changeLocale } from "@mirante/i18n";
import type { FeatureInfoEvent } from "@mirante/map";
import type {
  GeoNodeAuthenticationClient,
  GeoNodeDatasetClient,
  GeoNodeMapClient,
  GeoNodeUser,
} from "@mirante/geonode";
import {
  fireEvent,
  act,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapMock = vi.hoisted(() => ({
  create: vi.fn(),
  addDatasetLayer: vi.fn(),
  fitDatasetLayer: vi.fn(),
  fitGeographicExtent: vi.fn(),
  destroy: vi.fn(),
  removeDatasetLayer: vi.fn(),
  setDatasetLayerOpacity: vi.fn(),
  setDatasetLayerFilter: vi.fn(),
  setDatasetLayerVisibility: vi.fn(),
  setSelectedFeatureGeometry: vi.fn(),
  getView: vi.fn(),
  subscribeFeatureInfo: vi.fn(),
  setBaseMap: vi.fn(),
  setView: vi.fn(),
}));

const authenticatedUser: GeoNodeUser = {
  id: 1000,
  username: "admin",
  displayName: "Administrator",
  email: "admin@example.test",
  avatarUrl: "/avatar.png",
  isAdministrator: true,
  permissions: ["add_resource"],
  canUploadDatasets: true,
  canSaveMaps: true,
};

const viewerUser: GeoNodeUser = {
  ...authenticatedUser,
  id: 1001,
  username: "viewer",
  displayName: "Viewer",
  isAdministrator: false,
  permissions: [],
  canUploadDatasets: false,
  canSaveMaps: false,
};

const authenticationMock: GeoNodeAuthenticationClient = {
  restoreSession: vi.fn().mockResolvedValue(null),
  signIn: vi.fn().mockResolvedValue(authenticatedUser),
  signOut: vi.fn().mockResolvedValue(undefined),
};

const uploadDatasetMock = vi.fn<GeoNodeDatasetClient["uploadDataset"]>();
const exportDatasetFeaturesMock =
  vi.fn<GeoNodeDatasetClient["exportDatasetFeatures"]>();
const listDatasetsMock = vi.fn<GeoNodeDatasetClient["listDatasets"]>();
const listDatasetFeaturesMock =
  vi.fn<GeoNodeDatasetClient["listDatasetFeatures"]>();
const getDatasetMock = vi.fn<GeoNodeDatasetClient["getDataset"]>();
const datasetMock: GeoNodeDatasetClient = {
  exportDatasetFeatures: exportDatasetFeaturesMock,
  getDataset: getDatasetMock,
  listDatasetFeatures: listDatasetFeaturesMock,
  listDatasets: listDatasetsMock.mockResolvedValue({
    datasets: [
      {
        id: 7,
        title: "Municipal boundaries",
        layerName: "geonode:municipal_boundaries",
        wmsUrl: "/geoserver/ows",
        extent: [-54, -16, -45, -8],
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  }),
  uploadDataset: uploadDatasetMock.mockResolvedValue({
    id: 42,
    title: "Conservation areas",
    layerName: "geonode:conservation_areas",
    wmsUrl: "/geoserver/geonode/conservation_areas/ows",
    extent: [-54, -16, -45, -8],
  }),
};

const listMapsMock = vi.fn<GeoNodeMapClient["listMaps"]>();
const createSavedMapMock = vi.fn<GeoNodeMapClient["createMap"]>();
const updateSavedMapMock = vi.fn<GeoNodeMapClient["updateMap"]>();
const getSavedMapMock = vi.fn<GeoNodeMapClient["getMap"]>();
const savedMapMock: GeoNodeMapClient = {
  createMap: createSavedMapMock,
  getMap: getSavedMapMock,
  listMaps: listMapsMock,
  updateMap: updateSavedMapMock,
};
let featureInfoListener: ((event: FeatureInfoEvent) => void) | undefined;

vi.mock("@mirante/map", () => ({
  createMap: mapMock.create,
  defaultBaseMapId: "open-street-map",
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(async () => {
    await changeLocale("en");
    localStorage.clear();
    mapMock.create.mockReset();
    mapMock.addDatasetLayer.mockReset();
    mapMock.fitDatasetLayer.mockReset();
    mapMock.fitGeographicExtent.mockReset();
    mapMock.destroy.mockReset();
    mapMock.removeDatasetLayer.mockReset();
    mapMock.setDatasetLayerOpacity.mockReset();
    mapMock.setDatasetLayerFilter.mockReset();
    mapMock.setDatasetLayerVisibility.mockReset();
    mapMock.setSelectedFeatureGeometry.mockReset();
    mapMock.getView.mockReset();
    mapMock.getView.mockReturnValue({ center: [-52, -15], zoom: 4 });
    mapMock.subscribeFeatureInfo.mockReset();
    mapMock.subscribeFeatureInfo.mockImplementation(
      (listener: (event: FeatureInfoEvent) => void) => {
        featureInfoListener = listener;
        return vi.fn();
      },
    );
    mapMock.setBaseMap.mockReset();
    mapMock.setView.mockReset();
    vi.mocked(authenticationMock.restoreSession).mockReset();
    vi.mocked(authenticationMock.restoreSession).mockResolvedValue(null);
    vi.mocked(authenticationMock.signIn).mockReset();
    vi.mocked(authenticationMock.signIn).mockResolvedValue(authenticatedUser);
    vi.mocked(authenticationMock.signOut).mockReset();
    vi.mocked(authenticationMock.signOut).mockResolvedValue(undefined);
    uploadDatasetMock.mockReset();
    exportDatasetFeaturesMock.mockReset();
    exportDatasetFeaturesMock.mockResolvedValue({
      blob: new Blob(["name\nTest municipality"]),
      filename: "municipal-boundaries.csv",
    });
    getDatasetMock.mockReset();
    listDatasetFeaturesMock.mockReset();
    listDatasetsMock.mockReset();
    listMapsMock.mockReset();
    createSavedMapMock.mockReset();
    updateSavedMapMock.mockReset();
    getSavedMapMock.mockReset();
    listDatasetsMock.mockResolvedValue({
      datasets: [
        {
          id: 7,
          title: "Municipal boundaries",
          layerName: "geonode:municipal_boundaries",
          wmsUrl: "/geoserver/ows",
          extent: [-54, -16, -45, -8],
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    listDatasetFeaturesMock.mockResolvedValue({
      features: [
        {
          id: "municipal_boundaries.14",
          attributes: {
            name: "Test municipality",
            population: 1200,
            surveyDate: "2026-08-26",
          },
          geometry: { type: "Point", coordinates: [-47.9, -15.8] },
          extent: [-47.9, -15.8, -47.9, -15.8],
        },
      ],
      hasNext: false,
      page: 1,
      pageSize: 25,
      total: 1,
    });
    uploadDatasetMock.mockResolvedValue({
      id: 42,
      title: "Conservation areas",
      layerName: "geonode:conservation_areas",
      wmsUrl: "/geoserver/geonode/conservation_areas/ows",
      extent: [-54, -16, -45, -8],
    });
    listMapsMock.mockResolvedValue({
      maps: [{ id: 12, title: "Field survey" }],
      page: 1,
      pageSize: 50,
      total: 1,
    });
    createSavedMapMock.mockResolvedValue({ id: 13, title: "New map" });
    updateSavedMapMock.mockResolvedValue({ id: 12, title: "Field survey" });
    getSavedMapMock.mockResolvedValue({
      baseMap: "dark-matter",
      id: 12,
      title: "Field survey",
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
            field: "name",
            operator: "contains",
            type: "text",
            value: "Test",
          },
        },
      ],
    });
    getDatasetMock.mockResolvedValue({
      id: 7,
      title: "Municipal boundaries",
      layerName: "geonode:municipal_boundaries",
      wmsUrl: "/geoserver/ows",
      extent: [-54, -16, -45, -8],
    });
    mapMock.create.mockReturnValue({
      addDatasetLayer: mapMock.addDatasetLayer,
      fitDatasetLayer: mapMock.fitDatasetLayer,
      fitGeographicExtent: mapMock.fitGeographicExtent,
      getView: mapMock.getView,
      subscribeFeatureInfo: mapMock.subscribeFeatureInfo,
      setBaseMap: mapMock.setBaseMap,
      destroy: mapMock.destroy,
      removeDatasetLayer: mapMock.removeDatasetLayer,
      setDatasetLayerOpacity: mapMock.setDatasetLayerOpacity,
      setDatasetLayerFilter: mapMock.setDatasetLayerFilter,
      setDatasetLayerVisibility: mapMock.setDatasetLayerVisibility,
      setSelectedFeatureGeometry: mapMock.setSelectedFeatureGeometry,
      setView: mapMock.setView,
    });
  });

  it("creates and destroys the map through the public facade", () => {
    const { unmount } = render(
      <App authenticationClient={authenticationMock} />,
    );

    const mapRegion = screen.getByRole("region", {
      name: "Interactive map centered on Brazil",
    });

    expect(mapMock.create).toHaveBeenCalledWith({
      target: mapRegion,
      initialCenter: [-52, -15],
      initialZoom: 4,
    });

    unmount();

    expect(mapMock.destroy).toHaveBeenCalledOnce();
  });

  it("renders registered toolbar actions", async () => {
    render(<App authenticationClient={authenticationMock} />);

    expect(screen.getByRole("heading", { name: "Layers" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Base map" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toHaveTextContent("Sign in");
    });

    const toolbar = screen.getByRole("toolbar", { name: "Map tools" });
    expect(toolbar).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset map view" }));
    expect(mapMock.setView).toHaveBeenCalledWith({
      center: [-52, -15],
      zoom: 4,
    });

    expect(
      screen.queryByRole("button", { name: "Zoom to Brazil" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose base map" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Base map" }), {
      target: { value: "dark-matter" },
    });
    expect(mapMock.setBaseMap).toHaveBeenCalledWith("dark-matter");
  });

  it("changes and persists the interface locale at runtime", async () => {
    render(<App authenticationClient={authenticationMock} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "pt-BR" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Camadas" }),
      ).toBeInTheDocument();
    });

    expect(localStorage.getItem("mirante.locale")).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("signs in, displays the user, and signs out", async () => {
    render(<App authenticationClient={authenticationMock} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "User account" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(authenticationMock.signIn).toHaveBeenCalledWith({
        username: "admin",
        password: "secret",
      });
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toHaveTextContent("Administrator");
    });

    fireEvent.click(screen.getByRole("button", { name: "User account" }));
    expect(screen.getByText("Signed in as Administrator")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Manage datasets in GeoNode" }),
    ).toHaveAttribute("href", "http://localhost:8000/catalogue/#/");
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(authenticationMock.signOut).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toHaveTextContent("Sign in");
    });
  });

  it("does not expose upload to an authenticated user without permission", async () => {
    vi.mocked(authenticationMock.restoreSession).mockResolvedValue(viewerUser);

    render(<App authenticationClient={authenticationMock} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toHaveTextContent("Viewer"),
    );
    expect(
      screen.queryByRole("button", { name: "Upload dataset" }),
    ).not.toBeInTheDocument();
  });

  it("adds catalogue datasets to the map and removes active layers locally", async () => {
    render(
      <App
        authenticationClient={authenticationMock}
        datasetClient={datasetMock}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Published datasets" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Browse datasets" }));

    expect(
      await screen.findByRole("heading", { name: "Published datasets" }),
    ).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search datasets" }),
      {
        target: { value: "municipal" },
      },
    );
    await waitFor(() =>
      expect(listDatasetsMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: "municipal" }),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Clear dataset search" }),
    ).toBeInTheDocument();
    const addButton = await screen.findByRole("button", {
      name: "Add Municipal boundaries to the map",
    });
    fireEvent.click(addButton);

    expect(mapMock.addDatasetLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7,
        layerName: "geonode:municipal_boundaries",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Municipal boundaries is already on the map",
      }),
    ).toBeDisabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Zoom to Municipal boundaries" }),
    );
    expect(mapMock.fitDatasetLayer).toHaveBeenCalledWith(7);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Municipal boundaries from the map",
      }),
    );
    expect(mapMock.removeDatasetLayer).toHaveBeenCalledWith(7);
    expect(
      screen.getByRole("button", {
        name: "Add Municipal boundaries to the map",
      }),
    ).toBeEnabled();
  });

  it("shows attributes returned for a clicked map feature", async () => {
    render(<App authenticationClient={authenticationMock} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toBeEnabled(),
    );

    act(() => {
      featureInfoListener?.({
        status: "ready",
        features: [
          {
            datasetId: 7,
            datasetTitle: "Municipal boundaries",
            featureId: "municipalities.14",
            geometry: { type: "Point", coordinates: [-47.9, -15.8] },
            attributes: {
              name: "Test municipality",
              population: 1200,
              active: true,
              note: null,
            },
          },
        ],
      });
    });

    const dialog = screen.getByRole("dialog", { name: "Feature attributes" });
    expect(
      within(dialog).getByText("Municipal boundaries"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Feature municipalities.14"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Test municipality")).toBeInTheDocument();
    expect(within(dialog).getByText("1,200")).toBeInTheDocument();
    expect(within(dialog).getByText("Yes")).toBeInTheDocument();
    expect(within(dialog).getByText("Not informed")).toBeInTheDocument();
    expect(mapMock.setSelectedFeatureGeometry).toHaveBeenCalledWith({
      type: "Point",
      coordinates: [-47.9, -15.8],
    });

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Close feature attributes" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Feature attributes" }),
    ).not.toBeInTheDocument();
  });

  it("opens a paginated attribute table and locates a feature", async () => {
    render(
      <App
        authenticationClient={authenticationMock}
        datasetClient={datasetMock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Browse datasets" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Add Municipal boundaries to the map",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Open Municipal boundaries attribute table",
      }),
    );

    const tablePanel = await screen.findByRole("dialog", {
      name: "Municipal boundaries",
    });
    expect(listDatasetFeaturesMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({ page: 1, pageSize: 25 }),
    );
    expect(
      within(tablePanel).getByRole("columnheader", { name: "name" }),
    ).toBeInTheDocument();
    expect(
      within(tablePanel).getByText("Test municipality"),
    ).toBeInTheDocument();
    expect(within(tablePanel).getByText("1,200")).toBeInTheDocument();

    act(() => {
      featureInfoListener?.({
        status: "ready",
        features: [
          {
            datasetId: 7,
            datasetTitle: "Municipal boundaries",
            featureId: "municipal_boundaries.14",
            geometry: { type: "Point", coordinates: [-47.9, -15.8] },
            attributes: { name: "Test municipality" },
          },
        ],
      });
    });
    expect(
      within(tablePanel)
        .getByRole("rowheader", { name: "municipal_boundaries.14" })
        .closest("tr"),
    ).toHaveClass("attribute-table__row--selected");
    fireEvent.click(
      screen.getByRole("button", { name: "Close feature attributes" }),
    );

    fireEvent.change(within(tablePanel).getByLabelText("Value"), {
      target: { value: "Test" },
    });
    fireEvent.click(
      within(tablePanel).getByRole("button", { name: "Apply filter" }),
    );
    await waitFor(() =>
      expect(listDatasetFeaturesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 7 }),
        expect.objectContaining({
          filter: {
            field: "name",
            operator: "contains",
            type: "text",
            value: "Test",
          },
          page: 1,
        }),
      ),
    );
    expect(mapMock.setDatasetLayerFilter).toHaveBeenCalledWith(
      7,
      "\"name\" ILIKE '%Test%'",
    );

    fireEvent.change(within(tablePanel).getByLabelText("Attribute"), {
      target: { value: "population" },
    });
    fireEvent.change(within(tablePanel).getByLabelText("Value"), {
      target: { value: "1000" },
    });
    fireEvent.click(
      within(tablePanel).getByRole("button", { name: "Add condition" }),
    );
    expect(mapMock.setDatasetLayerFilter).toHaveBeenLastCalledWith(
      7,
      '("name" ILIKE \'%Test%\') AND ("population" = 1000)',
    );
    fireEvent.change(within(tablePanel).getByLabelText("Match"), {
      target: { value: "or" },
    });
    expect(mapMock.setDatasetLayerFilter).toHaveBeenLastCalledWith(
      7,
      '("name" ILIKE \'%Test%\') OR ("population" = 1000)',
    );

    const createObjectUrlMock = vi.fn(() => "blob:mirante-export");
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrlMock,
    });
    const downloadClickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    fireEvent.click(
      within(tablePanel).getByRole("button", { name: "Export CSV" }),
    );
    await waitFor(() =>
      expect(exportDatasetFeaturesMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: 7 }),
        {
          format: "csv",
          filter: {
            combinator: "or",
            conditions: [
              {
                field: "name",
                operator: "contains",
                type: "text",
                value: "Test",
              },
              {
                field: "population",
                operator: "equals",
                type: "number",
                value: "1000",
              },
            ],
          },
        },
      ),
    );
    expect(createObjectUrlMock).toHaveBeenCalledWith(expect.any(Blob));
    expect(downloadClickMock).toHaveBeenCalledOnce();
    expect(revokeObjectUrlMock).toHaveBeenCalledWith("blob:mirante-export");
    downloadClickMock.mockRestore();

    const locateButton = await within(tablePanel).findByRole("button", {
      name: "Locate feature municipal_boundaries.14 on the map",
    });
    fireEvent.click(locateButton);
    expect(mapMock.fitGeographicExtent).toHaveBeenCalledWith([
      -47.9, -15.8, -47.9, -15.8,
    ]);
    expect(mapMock.setSelectedFeatureGeometry).toHaveBeenCalledWith({
      type: "Point",
      coordinates: [-47.9, -15.8],
    });
    expect(locateButton.closest("tr")).toHaveClass(
      "attribute-table__row--selected",
    );

    fireEvent.click(
      within(tablePanel).getByRole("button", { name: "Clear filter" }),
    );
    expect(mapMock.setDatasetLayerFilter).toHaveBeenLastCalledWith(
      7,
      undefined,
    );

    fireEvent.change(within(tablePanel).getByLabelText("Attribute"), {
      target: { value: "surveyDate" },
    });
    fireEvent.change(within(tablePanel).getByLabelText("Operator"), {
      target: { value: "greater-than" },
    });
    fireEvent.change(within(tablePanel).getByLabelText("Value"), {
      target: { value: "2026-08-01" },
    });
    fireEvent.click(
      within(tablePanel).getByRole("button", { name: "Apply filter" }),
    );
    expect(mapMock.setDatasetLayerFilter).toHaveBeenLastCalledWith(
      7,
      "\"surveyDate\" > DATE '2026-08-01'",
    );

    fireEvent.click(
      within(tablePanel).getByRole("button", {
        name: "Close attribute table",
      }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Municipal boundaries" }),
    ).not.toBeInTheDocument();
  });

  it("uploads a valid GeoJSON and exposes map layer controls", async () => {
    const { container } = render(
      <App
        authenticationClient={authenticationMock}
        datasetClient={datasetMock}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "User account" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const uploadButton = await screen.findByRole("button", {
      name: "Upload dataset",
    });
    await waitFor(() => expect(uploadButton).toBeEnabled());
    fireEvent.click(uploadButton);

    const fileInput =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    const file = new File(
      [
        JSON.stringify({
          type: "FeatureCollection",
          features: [],
        }),
      ],
      "conservation-areas.geojson",
      { type: "application/geo+json" },
    );
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, { target: { files: [file] } });

    const dialog = screen.getByRole("dialog", { name: "Upload a dataset" });
    await within(dialog).findByText("Dataset file ready to upload.");
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Dataset title" }),
      { target: { value: "Protected areas" } },
    );
    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Description" }),
      { target: { value: "Protected territories" } },
    );
    fireEvent.change(
      within(dialog).getByRole("combobox", { name: "Geometry style" }),
      { target: { value: "point" } },
    );
    fireEvent.change(
      within(dialog).getByRole("combobox", { name: "Point shape" }),
      { target: { value: "square" } },
    );
    fireEvent.change(within(dialog).getByLabelText("Fill color"), {
      target: { value: "#22c55e" },
    });
    fireEvent.change(within(dialog).getByLabelText("Outline color"), {
      target: { value: "#14532d" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Upload dataset" }),
    );

    await within(dialog).findByText("Dataset published");
    expect(uploadDatasetMock).toHaveBeenCalledOnce();
    const uploadCall = uploadDatasetMock.mock.calls[0];
    expect(uploadCall?.[0]).toBe(file);
    expect(uploadCall?.[1]).toMatchObject({
      metadata: {
        title: "Protected areas",
        abstract: "Protected territories",
      },
      style: {
        geometry: "point",
        fillColor: "#22c55e",
        strokeColor: "#14532d",
        shape: "square",
      },
    });
    expect(typeof uploadCall?.[1]?.onProgress).toBe("function");
    expect(mapMock.addDatasetLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 42,
        layerName: "geonode:conservation_areas",
      }),
    );

    const visibility = screen.getByRole("checkbox", {
      name: "Show Conservation areas",
    });
    fireEvent.click(visibility);
    expect(mapMock.setDatasetLayerVisibility).toHaveBeenCalledWith(42, false);

    fireEvent.change(
      screen.getByRole("slider", { name: "Conservation areas opacity" }),
      { target: { value: "60" } },
    );
    expect(mapMock.setDatasetLayerOpacity).toHaveBeenCalledWith(42, 0.6);
  });

  it("saves and restores maps through the vanilla GeoNode map API", async () => {
    vi.mocked(authenticationMock.restoreSession).mockResolvedValue(
      authenticatedUser,
    );
    render(
      <App
        authenticationClient={authenticationMock}
        datasetClient={datasetMock}
        mapClient={savedMapMock}
      />,
    );

    const mapsButton = await screen.findByRole("button", {
      name: "Save or open a map",
    });
    fireEvent.click(mapsButton);
    const dialog = await screen.findByRole("dialog", { name: "Saved maps" });
    expect(await within(dialog).findByText("Field survey")).toBeInTheDocument();

    fireEvent.change(
      within(dialog).getByRole("textbox", { name: "Save current map" }),
      {
        target: { value: "Regional overview" },
      },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Save map" }));
    await within(dialog).findByText("Map saved in GeoNode.");
    expect(createSavedMapMock).toHaveBeenCalledWith({
      baseMap: "open-street-map",
      title: "Regional overview",
      view: { center: [-52, -15], zoom: 4 },
      layers: [],
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "Open" }));
    await waitFor(() => expect(getSavedMapMock).toHaveBeenCalledWith(12));
    expect(getDatasetMock).toHaveBeenCalledWith(7);
    expect(mapMock.addDatasetLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, fit: false }),
    );
    expect(mapMock.setDatasetLayerOpacity).toHaveBeenCalledWith(7, 0.6);
    expect(mapMock.setDatasetLayerVisibility).toHaveBeenCalledWith(7, false);
    expect(mapMock.setDatasetLayerFilter).toHaveBeenCalledWith(
      7,
      "\"name\" ILIKE '%Test%'",
    );
    expect(mapMock.setView).toHaveBeenCalledWith({
      center: [-47.9, -15.8],
      zoom: 8,
    });
    expect(mapMock.setBaseMap).toHaveBeenCalledWith("dark-matter");

    fireEvent.click(mapsButton);
    const reopenedDialog = await screen.findByRole("dialog", {
      name: "Saved maps",
    });
    expect(
      within(reopenedDialog).getByText("Current saved map"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(reopenedDialog).getByRole("button", { name: "Update map" }),
    );
    await within(reopenedDialog).findByText("Map updated in GeoNode.");
    expect(updateSavedMapMock).toHaveBeenCalledWith(12, {
      baseMap: "dark-matter",
      title: "Field survey",
      view: { center: [-52, -15], zoom: 4 },
      layers: [
        expect.objectContaining({
          datasetId: 7,
          filter: {
            field: "name",
            operator: "contains",
            type: "text",
            value: "Test",
          },
        }),
      ],
    });
  });
});
