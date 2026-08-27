import { useTranslation } from "react-i18next";

import { LayersIcon } from "./Icons";

export function LayersPanel() {
  const { t } = useTranslation("common");

  return (
    <aside className="layers-panel" aria-labelledby="layers-panel-title">
      <header className="layers-panel__header">
        <span className="shell-icon shell-icon--primary">
          <LayersIcon />
        </span>
        <h1 id="layers-panel-title">{t("shell.layers.title")}</h1>
        <span
          className="layers-panel__count"
          aria-label={t("shell.layers.count", { count: 1 })}
        >
          1
        </span>
      </header>

      <section className="layer-group" aria-labelledby="basemap-group-title">
        <h2 id="basemap-group-title">{t("shell.layers.baseMap")}</h2>
        <div className="layer-row">
          <span className="layer-row__status" aria-hidden="true" />
          <span className="layer-row__swatch" aria-hidden="true" />
          <span className="layer-row__name">
            {t("shell.layers.darkMatter")}
          </span>
          <span className="layer-row__type">XYZ</span>
        </div>
      </section>

      <p className="layers-panel__empty">{t("shell.layers.empty")}</p>
    </aside>
  );
}
