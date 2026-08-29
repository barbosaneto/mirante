import type { ExtensionPanelProps } from "@mirante/sdk";
import { useTranslation } from "react-i18next";

export function PresetsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path d="M5 6h14M5 12h14M5 18h14" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </svg>
  );
}

export function ViewPresetsPanel({ close, map }: ExtensionPanelProps) {
  const { t } = useTranslation("extension-view-presets");

  function applyBrazilView() {
    map.setView({ center: [-52, -15], zoom: 4 });
    close();
  }

  return (
    <div className="view-presets-extension">
      <p>{t("panel.description")}</p>
      <button
        type="button"
        className="button button--secondary"
        onClick={applyBrazilView}
      >
        {t("panel.brazil")}
      </button>
    </div>
  );
}
