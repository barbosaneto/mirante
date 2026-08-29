import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGeoNodeAuthenticationClient } from "./index";

const userPayload = {
  pk: 1000,
  username: "admin",
  first_name: "Mirante",
  last_name: "Administrator",
  email: "admin@example.test",
  avatar: "http://localhost:8000/static/avatar.png",
  perms: ["add_resource"],
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
      permissions: ["add_resource"],
      roles: ["authenticated-user", "contributor", "administrator"],
      canCreateMaps: true,
      canUploadDatasets: true,
      canManageGeoNode: true,
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
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("maps upload capability from the user's compact GeoNode permissions", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({ sub: "7", access_token: "ignored" }, { status: 200 }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            user: {
              ...userPayload,
              pk: 7,
              username: "viewer",
              perms: [],
              is_superuser: false,
              is_staff: false,
            },
          },
          { status: 200 },
        ),
      );
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "/",
      fetch: fetchMock,
      storage,
    });

    await expect(client.restoreSession()).resolves.toMatchObject({
      permissions: [],
      roles: ["authenticated-user"],
      canCreateMaps: false,
      canUploadDatasets: false,
      canManageGeoNode: false,
    });
    expect(storage.removeItem).toHaveBeenCalledWith("mirante.geonode.user-id");
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

  it("restores the current user only through an authenticated API response", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ sub: "1000" }, { status: 200 }))
      .mockResolvedValueOnce(
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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://geonode.example.test/api/v2/userinfo/",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://geonode.example.test/api/v2/users/1000",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("clears stale session state after GeoNode rejects it", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const client = createGeoNodeAuthenticationClient({
      baseUrl: "/",
      fetch: fetchMock,
      storage,
    });

    await expect(client.restoreSession()).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v2/userinfo/",
      expect.objectContaining({ credentials: "include" }),
    );
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
