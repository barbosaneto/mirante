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
      destroy: vi.fn(),
      setDatasetLayerOpacity: vi.fn(),
      setDatasetLayerVisibility: vi.fn(),
      setView: vi.fn(),
    };
    const { rerender } = render(
      <ActionDock
        actions={[action]}
        authenticated={false}
        map={map}
        uploadEnabled={false}
        onUpload={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Mirante" });

    expect(button).toBeDisabled();

    rerender(
      <ActionDock
        actions={[action]}
        authenticated={true}
        map={map}
        uploadEnabled={false}
        onUpload={vi.fn()}
      />,
    );
    fireEvent.click(button);

    expect(button).toBeEnabled();
    expect(onClick).toHaveBeenCalledWith({ map });
  });

  it("opens dataset upload only for authenticated users", () => {
    const onUpload = vi.fn();
    const map: MapFacade = {
      addDatasetLayer: vi.fn(),
      destroy: vi.fn(),
      setDatasetLayerOpacity: vi.fn(),
      setDatasetLayerVisibility: vi.fn(),
      setView: vi.fn(),
    };
    const { rerender } = render(
      <ActionDock
        actions={[]}
        authenticated={false}
        map={map}
        uploadEnabled
        onUpload={onUpload}
      />,
    );
    const button = screen.getByRole("button", { name: "Upload dataset" });

    expect(button).toBeDisabled();
    rerender(
      <ActionDock
        actions={[]}
        authenticated
        map={map}
        uploadEnabled
        onUpload={onUpload}
      />,
    );
    fireEvent.click(button);

    expect(onUpload).toHaveBeenCalledOnce();
  });
});
