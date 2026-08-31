import type { RegisteredToolbarItem } from "@mirante/core";
import type { MapFacade } from "@mirante/map";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActionDock } from "./ActionDock";

describe("ActionDock", () => {
  const noCapabilities = {
    createMaps: false,
    uploadDatasets: false,
    manageGeoNode: false,
    editCurrentMap: false,
    manageCurrentMap: false,
  } as const;
  const baseMaps = [
    {
      id: "open-street-map",
      labels: { en: "OpenStreetMap" },
      tileUrl: "https://example.test/{z}/{x}/{y}.png",
      attributions: [],
    },
  ];
  it("keeps protected extension actions disabled for anonymous users", () => {
    const onClick = vi.fn<RegisteredToolbarItem["onClick"]>();
    const action: RegisteredToolbarItem = {
      id: "protected-action",
      extensionId: "test-extension",
      translationNamespace: "common",
      labelKey: "application.name",
      icon: "home",
      requiresAuthentication: true,
      onClick,
    };
    const map: MapFacade = {
      addDatasetLayer: vi.fn(),
      fitDatasetLayer: vi.fn(),
      fitGeographicExtent: vi.fn(),
      getView: vi.fn(),
      destroy: vi.fn(),
      removeDatasetLayer: vi.fn(),
      setDatasetLayerOpacity: vi.fn(),
      setDatasetLayerFilter: vi.fn(),
      setDatasetLayerOrder: vi.fn(),
      setDatasetLayerVisibility: vi.fn(),
      setSelectedFeatureGeometry: vi.fn(),
      setBaseMap: vi.fn(),
      setView: vi.fn(),
      subscribeFeatureInfo: vi.fn(),
    };
    const { rerender } = render(
      <ActionDock
        actions={[action]}
        authenticated={false}
        baseMap="open-street-map"
        baseMaps={baseMaps}
        canUploadDatasets={false}
        capabilities={noCapabilities}
        fallbackLocale="en"
        map={map}
        uploadEnabled={false}
        onUpload={vi.fn()}
        onMaps={vi.fn()}
        onBaseMapChange={vi.fn()}
        onClosePanel={vi.fn()}
        onOpenPanel={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Mirante" });

    expect(button).toBeDisabled();

    rerender(
      <ActionDock
        actions={[action]}
        authenticated={true}
        baseMap="open-street-map"
        baseMaps={baseMaps}
        canUploadDatasets={false}
        capabilities={noCapabilities}
        fallbackLocale="en"
        map={map}
        uploadEnabled={false}
        onUpload={vi.fn()}
        onMaps={vi.fn()}
        onBaseMapChange={vi.fn()}
        onClosePanel={vi.fn()}
        onOpenPanel={vi.fn()}
      />,
    );
    fireEvent.click(button);

    expect(button).toBeEnabled();
    const context = onClick.mock.calls[0]?.[0];
    expect(context?.map).toBe(map);
    expect(typeof context?.ui.closePanel).toBe("function");
    expect(typeof context?.ui.openPanel).toBe("function");
  });

  it("exposes dataset upload only to users with the GeoNode capability", () => {
    const onUpload = vi.fn();
    const map: MapFacade = {
      addDatasetLayer: vi.fn(),
      fitDatasetLayer: vi.fn(),
      fitGeographicExtent: vi.fn(),
      getView: vi.fn(),
      destroy: vi.fn(),
      removeDatasetLayer: vi.fn(),
      setDatasetLayerOpacity: vi.fn(),
      setDatasetLayerFilter: vi.fn(),
      setDatasetLayerOrder: vi.fn(),
      setDatasetLayerVisibility: vi.fn(),
      setSelectedFeatureGeometry: vi.fn(),
      setBaseMap: vi.fn(),
      setView: vi.fn(),
      subscribeFeatureInfo: vi.fn(),
    };
    const { rerender } = render(
      <ActionDock
        actions={[]}
        authenticated={false}
        baseMap="open-street-map"
        baseMaps={baseMaps}
        canUploadDatasets={false}
        capabilities={noCapabilities}
        fallbackLocale="en"
        map={map}
        uploadEnabled
        onUpload={onUpload}
        onMaps={vi.fn()}
        onBaseMapChange={vi.fn()}
        onClosePanel={vi.fn()}
        onOpenPanel={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Upload dataset" }),
    ).not.toBeInTheDocument();
    rerender(
      <ActionDock
        actions={[]}
        authenticated
        baseMap="open-street-map"
        baseMaps={baseMaps}
        canUploadDatasets
        capabilities={{ ...noCapabilities, uploadDatasets: true }}
        fallbackLocale="en"
        map={map}
        uploadEnabled
        onUpload={onUpload}
        onMaps={vi.fn()}
        onBaseMapChange={vi.fn()}
        onClosePanel={vi.fn()}
        onOpenPanel={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Upload dataset" });
    fireEvent.click(button);

    expect(onUpload).toHaveBeenCalledOnce();
  });

  it("enforces extension capability requirements", () => {
    const onClick = vi.fn<RegisteredToolbarItem["onClick"]>();
    const action: RegisteredToolbarItem = {
      id: "map-editor",
      extensionId: "test-extension",
      translationNamespace: "common",
      labelKey: "application.name",
      icon: "home",
      access: { allOf: ["editCurrentMap"] },
      onClick,
    };
    const map = {
      addDatasetLayer: vi.fn(),
      fitDatasetLayer: vi.fn(),
      fitGeographicExtent: vi.fn(),
      getView: vi.fn(),
      destroy: vi.fn(),
      removeDatasetLayer: vi.fn(),
      setDatasetLayerOpacity: vi.fn(),
      setDatasetLayerFilter: vi.fn(),
      setDatasetLayerOrder: vi.fn(),
      setDatasetLayerVisibility: vi.fn(),
      setSelectedFeatureGeometry: vi.fn(),
      setBaseMap: vi.fn(),
      setView: vi.fn(),
      subscribeFeatureInfo: vi.fn(),
    } satisfies MapFacade;
    const commonProps = {
      actions: [action],
      authenticated: true,
      baseMap: "open-street-map",
      baseMaps,
      canUploadDatasets: false,
      fallbackLocale: "en",
      map,
      uploadEnabled: false,
      onUpload: vi.fn(),
      onMaps: vi.fn(),
      onBaseMapChange: vi.fn(),
      onClosePanel: vi.fn(),
      onOpenPanel: vi.fn(),
    } as const;
    const { rerender } = render(
      <ActionDock {...commonProps} capabilities={noCapabilities} />,
    );
    const button = screen.getByRole("button", { name: "Mirante" });
    expect(button).toBeDisabled();

    rerender(
      <ActionDock
        {...commonProps}
        capabilities={{ ...noCapabilities, editCurrentMap: true }}
      />,
    );
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
