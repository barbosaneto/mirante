import { changeLocale } from "@mirante/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapMock = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
  setView: vi.fn(),
}));

vi.mock("@mirante/map", () => ({
  createMap: mapMock.create,
}));

import { App } from "./App";

describe("App", () => {
  beforeEach(async () => {
    await changeLocale("en");
    localStorage.clear();
    mapMock.create.mockReset();
    mapMock.destroy.mockReset();
    mapMock.setView.mockReset();
    mapMock.create.mockReturnValue({
      destroy: mapMock.destroy,
      setView: mapMock.setView,
    });
  });

  it("creates and destroys the map through the public facade", () => {
    const { unmount } = render(<App />);

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

  it("renders registered toolbar actions", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Layers" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Base map" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dark Matter")).toBeInTheDocument();
    expect(screen.getByLabelText("User area")).toHaveTextContent("Guest");

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
    render(<App />);

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
});
