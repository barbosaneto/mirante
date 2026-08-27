import type { RegisteredToolbarItem } from "@mirante/core";
import type { MapFacade } from "@mirante/map";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActionDock } from "./ActionDock";

describe("ActionDock", () => {
  it("keeps protected extension actions disabled for anonymous users", () => {
    const onClick = vi.fn();
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
        canUploadDatasets={false}
        map={map}
        uploadEnabled={false}
        onUpload={vi.fn()}
        onMaps={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Mirante" });

    expect(button).toBeDisabled();

    rerender(
      <ActionDock
        actions={[action]}
        authenticated={true}
        canUploadDatasets={false}
        map={map}
        uploadEnabled={false}
        onUpload={vi.fn()}
        onMaps={vi.fn()}
      />,
    );
    fireEvent.click(button);

    expect(button).toBeEnabled();
    expect(onClick).toHaveBeenCalledWith({ map });
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
        canUploadDatasets={false}
        map={map}
        uploadEnabled
        onUpload={onUpload}
        onMaps={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Upload dataset" }),
    ).not.toBeInTheDocument();
    rerender(
      <ActionDock
        actions={[]}
        authenticated
        canUploadDatasets
        map={map}
        uploadEnabled
        onUpload={onUpload}
        onMaps={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Upload dataset" });
    fireEvent.click(button);

    expect(onUpload).toHaveBeenCalledOnce();
  });
});
