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

  it("renders the initial application shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Layers" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Base map" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dark Matter")).toBeInTheDocument();
    expect(screen.getByLabelText("User area")).toHaveTextContent("Guest");

    const toolbar = screen.getByRole("toolbar", { name: "Map tools" });
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inspect map" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Measure" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Draw" })).toBeDisabled();
  });
});
