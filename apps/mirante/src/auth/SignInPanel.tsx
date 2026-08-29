import type { RegisteredAuthenticationProvider } from "@mirante/core";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "./AuthenticationContext";

export function SignInPanel({
  descriptionId,
  onCancel,
  onProviderSignIn,
  providers,
}: {
  descriptionId: string;
  onCancel?: () => void;
  onProviderSignIn: (provider: RegisteredAuthenticationProvider) => void;
  providers: readonly RegisteredAuthenticationProvider[];
}) {
  const { t, i18n } = useTranslation("authentication");
  const { clearError, error, signIn, status } = useAuthentication();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const authenticated = await signIn({ username, password });
    if (!authenticated) setPassword("");
  }

  return (
    <>
      <header>
        <h2 id="authentication-dialog-title">{t("dialog.title")}</h2>
        <p id={descriptionId}>{t("dialog.description")}</p>
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
          {onCancel ? (
            <button
              type="button"
              className="button button--secondary"
              disabled={status === "signing-in"}
              onClick={() => {
                clearError();
                setPassword("");
                onCancel();
              }}
            >
              {t("dialog.cancel")}
            </button>
          ) : null}
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

      {providers.length > 0 ? (
        <div className="authentication-providers">
          <p>{t("providers.separator")}</p>
          {providers.map((provider) => {
            const Icon = provider.icon;
            return (
              <button
                key={provider.id}
                type="button"
                className="button button--secondary authentication-provider"
                disabled={status === "signing-in"}
                onClick={() => onProviderSignIn(provider)}
              >
                {Icon ? (
                  <Icon className="authentication-provider__icon" />
                ) : null}
                <span>
                  {String(
                    i18n.t(provider.labelKey, {
                      ns: provider.translationNamespace,
                    }),
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
