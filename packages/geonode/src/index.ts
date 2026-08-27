export interface GeoNodeUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  isAdministrator: boolean;
}

export interface GeoNodeCredentials {
  username: string;
  password: string;
}

export type AuthenticationErrorCode =
  | "csrf-unavailable"
  | "invalid-credentials"
  | "network"
  | "session-expired"
  | "unexpected-response";

export class GeoNodeAuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;

  constructor(code: AuthenticationErrorCode, message: string) {
    super(message);
    this.name = "GeoNodeAuthenticationError";
    this.code = code;
  }
}

export interface GeoNodeAuthenticationClient {
  restoreSession: () => Promise<GeoNodeUser | null>;
  signIn: (credentials: GeoNodeCredentials) => Promise<GeoNodeUser>;
  signOut: () => Promise<void>;
}

interface GeoNodeUserPayload {
  pk: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar: string;
  is_superuser: boolean;
  is_staff: boolean;
}

interface StorageAdapter {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface CreateClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  storage?: StorageAdapter;
}

const storedUserIdKey = "mirante.geonode.user-id";

function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl === "/" || baseUrl === "") {
    return path;
  }

  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseUserPayload(value: unknown): GeoNodeUserPayload {
  if (
    !isRecord(value) ||
    typeof value.pk !== "number" ||
    typeof value.username !== "string" ||
    typeof value.first_name !== "string" ||
    typeof value.last_name !== "string" ||
    typeof value.email !== "string" ||
    typeof value.avatar !== "string" ||
    typeof value.is_superuser !== "boolean" ||
    typeof value.is_staff !== "boolean"
  ) {
    throw new GeoNodeAuthenticationError(
      "unexpected-response",
      "GeoNode returned an invalid user payload.",
    );
  }

  return value as unknown as GeoNodeUserPayload;
}

function mapUser(payload: GeoNodeUserPayload): GeoNodeUser {
  const fullName = [payload.first_name, payload.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    id: payload.pk,
    username: payload.username,
    displayName: fullName || payload.username,
    email: payload.email,
    avatarUrl: payload.avatar,
    isAdministrator: payload.is_superuser || payload.is_staff,
  };
}

function parseCsrfToken(html: string): string {
  const match = html.match(
    /name=["']csrfmiddlewaretoken["']\s+value=["']([^"']+)["']/,
  );

  if (!match?.[1]) {
    throw new GeoNodeAuthenticationError(
      "csrf-unavailable",
      "GeoNode did not provide a CSRF token.",
    );
  }

  return match[1];
}

function getDefaultStorage(): StorageAdapter | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createGeoNodeAuthenticationClient({
  baseUrl,
  fetch: fetchImplementation = globalThis.fetch,
  storage = getDefaultStorage(),
}: CreateClientOptions): GeoNodeAuthenticationClient {
  async function request(path: string, init?: RequestInit): Promise<Response> {
    try {
      return await fetchImplementation(joinUrl(baseUrl, path), {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json, text/plain, text/html",
          ...init?.headers,
        },
      });
    } catch (error) {
      throw new GeoNodeAuthenticationError(
        "network",
        `GeoNode request failed: ${error instanceof Error ? error.message : "unknown network error"}`,
      );
    }
  }

  async function getCsrfToken(path: string): Promise<string> {
    const response = await request(path);

    if (!response.ok) {
      throw new GeoNodeAuthenticationError(
        "csrf-unavailable",
        `GeoNode CSRF request failed with status ${response.status}.`,
      );
    }

    return parseCsrfToken(await response.text());
  }

  async function getUserById(userId: number): Promise<GeoNodeUser> {
    const response = await request(`/api/v2/users/${userId}`);

    if (response.status === 401 || response.status === 403) {
      throw new GeoNodeAuthenticationError(
        "session-expired",
        "The GeoNode session is not authenticated.",
      );
    }

    if (!response.ok) {
      throw new GeoNodeAuthenticationError(
        "unexpected-response",
        `GeoNode user request failed with status ${response.status}.`,
      );
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload) || !("user" in payload)) {
      throw new GeoNodeAuthenticationError(
        "unexpected-response",
        "GeoNode returned an invalid user response.",
      );
    }

    return mapUser(parseUserPayload(payload.user));
  }

  async function getUserByUsername(username: string): Promise<GeoNodeUser> {
    const query = new URLSearchParams({ "filter{username}": username });
    const response = await request(`/api/v2/users/?${query.toString()}`);

    if (!response.ok) {
      throw new GeoNodeAuthenticationError(
        "unexpected-response",
        `GeoNode user lookup failed with status ${response.status}.`,
      );
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload) || !Array.isArray(payload.users)) {
      throw new GeoNodeAuthenticationError(
        "unexpected-response",
        "GeoNode returned an invalid user lookup response.",
      );
    }

    const userPayload: unknown = payload.users[0];

    if (!userPayload) {
      throw new GeoNodeAuthenticationError(
        "unexpected-response",
        "GeoNode authenticated the session but returned no matching user.",
      );
    }

    return mapUser(parseUserPayload(userPayload));
  }

  return {
    async restoreSession() {
      const rawUserId = storage?.getItem(storedUserIdKey);

      if (!rawUserId || !/^\d+$/.test(rawUserId)) {
        storage?.removeItem(storedUserIdKey);
        return null;
      }

      try {
        return await getUserById(Number(rawUserId));
      } catch (error) {
        if (
          error instanceof GeoNodeAuthenticationError &&
          (error.code === "session-expired" ||
            error.code === "unexpected-response")
        ) {
          storage?.removeItem(storedUserIdKey);
          return null;
        }

        throw error;
      }
    },

    async signIn({ username, password }) {
      const csrfToken = await getCsrfToken("/account/login/");
      const body = new URLSearchParams({
        csrfmiddlewaretoken: csrfToken,
        password,
        username,
      });
      const response = await request("/account/ajax_login", {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRFToken": csrfToken,
        },
      });

      if (response.status === 400) {
        throw new GeoNodeAuthenticationError(
          "invalid-credentials",
          "GeoNode rejected the supplied credentials.",
        );
      }

      if (!response.ok) {
        throw new GeoNodeAuthenticationError(
          "unexpected-response",
          `GeoNode login failed with status ${response.status}.`,
        );
      }

      const user = await getUserByUsername(username);
      storage?.setItem(storedUserIdKey, String(user.id));
      return user;
    },

    async signOut() {
      const csrfToken = await getCsrfToken("/account/logout/");
      const body = new URLSearchParams({
        csrfmiddlewaretoken: csrfToken,
      });
      const response = await request("/account/logout/", {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "X-CSRFToken": csrfToken,
        },
        redirect: "manual",
      });

      const redirected =
        response.type === "opaqueredirect" ||
        response.status === 0 ||
        (response.status >= 300 && response.status < 400);

      if (!response.ok && !redirected) {
        throw new GeoNodeAuthenticationError(
          "unexpected-response",
          `GeoNode logout failed with status ${response.status}.`,
        );
      }

      storage?.removeItem(storedUserIdKey);
    },
  };
}
