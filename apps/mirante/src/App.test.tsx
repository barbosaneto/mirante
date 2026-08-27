import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapMock = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("@mirante/map", () => ({
  createMap: mapMock.create,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    mapMock.create.mockReset();
    mapMock.destroy.mockReset();
    mapMock.create.mockReturnValue({ destroy: mapMock.destroy });
  });

  it("creates and destroys the map through the public facade", () => {
    const { unmount } = render(<App />);

    const mapRegion = screen.getByRole("region", {
      name: "Interactive map centered on Brazil",
    });

    expect(mapMock.create).toHaveBeenCalledWith({ target: mapRegion });

    unmount();

    expect(mapMock.destroy).toHaveBeenCalledOnce();
  });
});
