import type {
  AuthenticationErrorCode,
  GeoNodeCredentials,
  GeoNodeUser,
} from "@mirante/geonode";
import { createContext, useContext } from "react";

export type AuthenticationStatus =
  | "anonymous"
  | "authenticated"
  | "restoring"
  | "signing-in"
  | "signing-out";

export interface AuthenticationContextValue {
  error: AuthenticationErrorCode | null;
  status: AuthenticationStatus;
  user: GeoNodeUser | null;
  clearError: () => void;
  signIn: (credentials: GeoNodeCredentials) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const AuthenticationContext = createContext<
  AuthenticationContextValue | undefined
>(undefined);

export function useAuthentication(): AuthenticationContextValue {
  const context = useContext(AuthenticationContext);

  if (!context) {
    throw new Error(
      "useAuthentication must be used inside AuthenticationProvider.",
    );
  }

  return context;
}
