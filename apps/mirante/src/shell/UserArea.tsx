import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "../auth/AuthenticationContext";
import { ExternalLinkIcon, UserIcon } from "./Icons";

export function UserArea({
  datasetManagementUrl,
}: {
  datasetManagementUrl: string;
}) {
  const { t } = useTranslation("authentication");
  const { clearError, error, signIn, signOut, status, user } =
    useAuthentication();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      setLoginOpen(false);
      setPassword("");
    }
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const authenticated = await signIn({ username, password });

    if (!authenticated) {
      setPassword("");
    }
  }

  const restoring = status === "restoring";
  const authenticated = status === "authenticated" || status === "signing-out";
  const label = restoring
    ? t("checkSession")
    : authenticated && user
      ? user.displayName
      : t("signIn");

  return (
    <>
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

      {loginOpen ? (
        <div className="authentication-backdrop">
          <section
            className="authentication-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="authentication-dialog-title"
            aria-describedby="authentication-dialog-description"
          >
            <header>
              <h2 id="authentication-dialog-title">{t("dialog.title")}</h2>
              <p id="authentication-dialog-description">
                {t("dialog.description")}
              </p>
            </header>

            <form onSubmit={(event) => void handleSubmit(event)}>
              <label>
                <span>{t("dialog.username")}</span>
                <input
                  autoFocus
                  required
                  autoComplete="username"
                  name="username"
                  value={username}
                  onChange={(event) => setUsername(event.currentTarget.value)}
                />
              </label>

              <label>
                <span>{t("dialog.password")}</span>
                <input
                  required
                  autoComplete="current-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.currentTarget.value)}
                />
              </label>

              {error ? (
                <p className="authentication-error" role="alert">
                  {t(`errors.${error}`)}
                </p>
              ) : null}

              <footer>
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={status === "signing-in"}
                  onClick={() => {
                    clearError();
                    setLoginOpen(false);
                    setPassword("");
                  }}
                >
                  {t("dialog.cancel")}
                </button>
                <button
                  type="submit"
                  className="button button--primary"
                  disabled={status === "signing-in"}
                >
                  {status === "signing-in"
                    ? t("dialog.submitting")
                    : t("dialog.submit")}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
