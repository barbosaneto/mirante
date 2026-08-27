import {
  GeoNodeAuthenticationError,
  type AuthenticationErrorCode,
  type GeoNodeAuthenticationClient,
  type GeoNodeUser,
} from "@mirante/geonode";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  AuthenticationContext,
  type AuthenticationContextValue,
  type AuthenticationStatus,
} from "./AuthenticationContext";

function getErrorCode(error: unknown): AuthenticationErrorCode {
  return error instanceof GeoNodeAuthenticationError
    ? error.code
    : "unexpected-response";
}

export function AuthenticationProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: GeoNodeAuthenticationClient;
}) {
  const [status, setStatus] = useState<AuthenticationStatus>("restoring");
  const [user, setUser] = useState<GeoNodeUser | null>(null);
  const [error, setError] = useState<AuthenticationErrorCode | null>(null);

  useEffect(() => {
    let active = true;

    void client
      .restoreSession()
      .then((restoredUser) => {
        if (!active) {
          return;
        }

        setUser(restoredUser);
        setStatus(restoredUser ? "authenticated" : "anonymous");
      })
      .catch((restoreError: unknown) => {
        if (!active) {
          return;
        }

        setError(getErrorCode(restoreError));
        setStatus("anonymous");
      });

    return () => {
      active = false;
    };
  }, [client]);

  const value = useMemo<AuthenticationContextValue>(
    () => ({
      error,
      status,
      user,
      clearError() {
        setError(null);
      },
      async signIn(credentials) {
        setError(null);
        setStatus("signing-in");

        try {
          const authenticatedUser = await client.signIn(credentials);
          setUser(authenticatedUser);
          setStatus("authenticated");
          return true;
        } catch (signInError) {
          setUser(null);
          setError(getErrorCode(signInError));
          setStatus("anonymous");
          return false;
        }
      },
      async signOut() {
        setError(null);
        setStatus("signing-out");

        try {
          await client.signOut();
          setUser(null);
          setStatus("anonymous");
        } catch (signOutError) {
          setError(getErrorCode(signOutError));
          setStatus("authenticated");
        }
      },
    }),
    [client, error, status, user],
  );

  return (
    <AuthenticationContext.Provider value={value}>
      {children}
    </AuthenticationContext.Provider>
  );
}
