import { changeLocale } from "@mirante/i18n";
import type {
  GeoNodeAuthenticationClient,
  GeoNodeDatasetClient,
  GeoNodeUser,
} from "@mirante/geonode";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapMock = vi.hoisted(() => ({
  create: vi.fn(),
  addDatasetLayer: vi.fn(),
  destroy: vi.fn(),
  removeDatasetLayer: vi.fn(),
  setDatasetLayerOpacity: vi.fn(),
  setDatasetLayerVisibility: vi.fn(),
  setView: vi.fn(),
}));

const authenticatedUser: GeoNodeUser = {
  id: 1000,
  username: "admin",
  displayName: "Administrator",
  email: "admin@example.test",
  avatarUrl: "/avatar.png",
  isAdministrator: true,
};

const authenticationMock: GeoNodeAuthenticationClient = {
  restoreSession: vi.fn().mockResolvedValue(null),
  signIn: vi.fn().mockResolvedValue(authenticatedUser),
  signOut: vi.fn().mockResolvedValue(undefined),
};

const uploadDatasetMock = vi.fn<GeoNodeDatasetClient["uploadDataset"]>();
const listDatasetsMock = vi.fn<GeoNodeDatasetClient["listDatasets"]>();
const datasetMock: GeoNodeDatasetClient = {
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

vi.mock("@mirante/map", () => ({
  createMap: mapMock.create,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(async () => {
    await changeLocale("en");
    localStorage.clear();
    mapMock.create.mockReset();
    mapMock.addDatasetLayer.mockReset();
    mapMock.destroy.mockReset();
    mapMock.removeDatasetLayer.mockReset();
    mapMock.setDatasetLayerOpacity.mockReset();
    mapMock.setDatasetLayerVisibility.mockReset();
    mapMock.setView.mockReset();
    vi.mocked(authenticationMock.restoreSession).mockReset();
    vi.mocked(authenticationMock.restoreSession).mockResolvedValue(null);
    vi.mocked(authenticationMock.signIn).mockReset();
    vi.mocked(authenticationMock.signIn).mockResolvedValue(authenticatedUser);
    vi.mocked(authenticationMock.signOut).mockReset();
    vi.mocked(authenticationMock.signOut).mockResolvedValue(undefined);
    uploadDatasetMock.mockReset();
    listDatasetsMock.mockReset();
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
    uploadDatasetMock.mockResolvedValue({
      id: 42,
      title: "Conservation areas",
      layerName: "geonode:conservation_areas",
      wmsUrl: "/geoserver/geonode/conservation_areas/ows",
      extent: [-54, -16, -45, -8],
    });
    mapMock.create.mockReturnValue({
      addDatasetLayer: mapMock.addDatasetLayer,
      destroy: mapMock.destroy,
      removeDatasetLayer: mapMock.removeDatasetLayer,
      setDatasetLayerOpacity: mapMock.setDatasetLayerOpacity,
      setDatasetLayerVisibility: mapMock.setDatasetLayerVisibility,
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
      screen.getByRole("heading", { name: "Base map" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dark Matter")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Zoom to Brazil" }));
    expect(mapMock.setView).toHaveBeenCalledWith({
      center: [-52, -14],
      zoom: 4.5,
    });
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
    ).toHaveAttribute("href", "/catalogue/#/");
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(authenticationMock.signOut).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toHaveTextContent("Sign in");
    });
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
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Upload dataset" }),
    );

    await within(dialog).findByText("Dataset published");
    expect(uploadDatasetMock).toHaveBeenCalledWith(file, expect.anything());
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
});
