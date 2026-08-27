import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGeoNodeAuthenticationClient } from "./index";

const userPayload = {
  pk: 1000,
  username: "admin",
  first_name: "Mirante",
  last_name: "Administrator",
  email: "admin@example.test",
  avatar: "http://localhost:8000/static/avatar.png",
  is_superuser: true,
  is_staff: true,
};

function htmlResponse(): Response {
  return new Response(
    '<form><input name="csrfmiddlewaretoken" value="csrf-token"></form>',
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}

describe("GeoNode authentication client", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const storage = {
    getItem: vi.fn<(key: string) => string | null>(),
    removeItem: vi.fn<(key: string) => void>(),
    setItem: vi.fn<(key: string, value: string) => void>(),
  };

  beforeEach(() => {
    fetchMock.mockReset();
    storage.getItem.mockReset();
    storage.removeItem.mockReset();
    storage.setItem.mockReset();
  });

  it("signs in with the vanilla session endpoint and maps the API user", async () => {
    fetchMock
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(new Response("successful login", { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({ users: [userPayload] }, { status: 200 }),
      );
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "/",
      fetch: fetchMock,
      storage,
    });

    await expect(
      client.signIn({ username: "admin", password: "secret" }),
    ).resolves.toEqual({
      id: 1000,
      username: "admin",
      displayName: "Mirante Administrator",
      email: "admin@example.test",
      avatarUrl: "http://localhost:8000/static/avatar.png",
      isAdministrator: true,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/account/login/",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/account/ajax_login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v2/users/?filter%7Busername%7D=admin",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      "mirante.geonode.user-id",
      "1000",
    );
  });

  it("reports invalid credentials without persisting a user", async () => {
    fetchMock
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(new Response("bad credentials", { status: 400 }));
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "/",
      fetch: fetchMock,
      storage,
    });

    await expect(
      client.signIn({ username: "admin", password: "wrong" }),
    ).rejects.toMatchObject({
      code: "invalid-credentials",
    });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("restores a stored user only through an authenticated API response", async () => {
    storage.getItem.mockReturnValue("1000");
    fetchMock.mockResolvedValueOnce(
      Response.json({ user: userPayload }, { status: 200 }),
    );
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "https://geonode.example.test/",
      fetch: fetchMock,
      storage,
    });

    await expect(client.restoreSession()).resolves.toMatchObject({
      id: 1000,
      username: "admin",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://geonode.example.test/api/v2/users/1000",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("clears stale session state after GeoNode rejects it", async () => {
    storage.getItem.mockReturnValue("1000");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "/",
      fetch: fetchMock,
      storage,
    });

    await expect(client.restoreSession()).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith("mirante.geonode.user-id");
  });

  it("logs out through the vanilla CSRF-protected account endpoint", async () => {
    fetchMock
      .mockResolvedValueOnce(htmlResponse())
      .mockResolvedValueOnce(new Response(null, { status: 302 }));
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "/",
      fetch: fetchMock,
      storage,
    });

    await client.signOut();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/account/logout/",
      expect.objectContaining({ method: "POST", redirect: "manual" }),
    );
    expect(storage.removeItem).toHaveBeenCalledWith("mirante.geonode.user-id");
  });
});
