import type { RegisteredAuthenticationProvider } from "@mirante/core";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "../auth/AuthenticationContext";
import { SignInPanel } from "../auth/SignInPanel";
import { ExternalLinkIcon, UserIcon } from "./Icons";

export function UserArea({
  datasetManagementUrl,
  leadingControl,
  onProviderSignIn,
  providers,
}: {
  datasetManagementUrl: string;
  leadingControl?: ReactNode;
  onProviderSignIn: (provider: RegisteredAuthenticationProvider) => void;
  providers: readonly RegisteredAuthenticationProvider[];
}) {
  const { t } = useTranslation("authentication");
  const { clearError, error, signOut, status, user } = useAuthentication();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setLoginOpen(false);
    }
  }, [status]);

  const restoring = status === "restoring";
  const authenticated = status === "authenticated" || status === "signing-out";
  const label = restoring
    ? t("checkSession")
    : authenticated && user
      ? user.displayName
      : t("signIn");

  return (
    <>
      <div className="account-controls">
        {leadingControl}
        <button
          className="user-area"
          type="button"
          aria-label={t("areaLabel")}
          aria-expanded={authenticated ? menuOpen : loginOpen}
          aria-haspopup={authenticated ? "menu" : "dialog"}
          disabled={restoring}
          onClick={() => {
            clearError();

            if (authenticated) {
              setMenuOpen((open) => !open);
            } else {
              setLoginOpen(true);
            }
          }}
        >
          <span className="shell-icon">
            <UserIcon />
          </span>
          <span className="user-area__label">{label}</span>
        </button>

        {authenticated && user && menuOpen ? (
          <div className="user-menu" role="menu">
            <p>{t("signedInAs", { name: user.displayName })}</p>
            {error ? (
              <p className="authentication-error" role="alert">
                {t(`errors.${error}`)}
              </p>
            ) : null}
            <a
              href={datasetManagementUrl}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <span>{t("manageDatasets")}</span>
              <span className="shell-icon">
                <ExternalLinkIcon />
              </span>
            </a>
            <button
              type="button"
              role="menuitem"
              disabled={status === "signing-out"}
              onClick={() => void signOut()}
            >
              {status === "signing-out" ? t("signingOut") : t("signOut")}
            </button>
          </div>
        ) : null}
      </div>

      {loginOpen ? (
        <div className="authentication-backdrop">
          <section
            className="authentication-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="authentication-dialog-title"
            aria-describedby="authentication-dialog-description"
          >
            <SignInPanel
              descriptionId="authentication-dialog-description"
              providers={providers}
              onCancel={() => setLoginOpen(false)}
              onProviderSignIn={onProviderSignIn}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
