import { changeLocale } from "@mirante/i18n";
import type {
  GeoNodeAuthenticationClient,
  GeoNodeUser,
} from "@mirante/geonode";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapMock = vi.hoisted(() => ({
  create: vi.fn(),
  destroy: vi.fn(),
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
    vi.mocked(authenticationMock.restoreSession).mockReset();
    vi.mocked(authenticationMock.restoreSession).mockResolvedValue(null);
    vi.mocked(authenticationMock.signIn).mockReset();
    vi.mocked(authenticationMock.signIn).mockResolvedValue(authenticatedUser);
    vi.mocked(authenticationMock.signOut).mockReset();
    vi.mocked(authenticationMock.signOut).mockResolvedValue(undefined);
    mapMock.create.mockReturnValue({
      destroy: mapMock.destroy,
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
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(authenticationMock.signOut).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", { name: "User account" }),
      ).toHaveTextContent("Sign in");
    });
  });
});
