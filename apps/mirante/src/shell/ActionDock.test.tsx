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
      destroy: vi.fn(),
      setView: vi.fn(),
    };
    const { rerender } = render(
      <ActionDock actions={[action]} authenticated={false} map={map} />,
    );
    const button = screen.getByRole("button", { name: "Mirante" });

    expect(button).toBeDisabled();

    rerender(<ActionDock actions={[action]} authenticated={true} map={map} />);
    fireEvent.click(button);

    expect(button).toBeEnabled();
    expect(onClick).toHaveBeenCalledWith({ map });
  });
});
