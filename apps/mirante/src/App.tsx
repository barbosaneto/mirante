import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation("common");

  return (
    <main className="app-shell">
      <h1>{t("application.name")}</h1>
      <p>{t("application.tagline")}</p>
    </main>
  );
}
