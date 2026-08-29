import type { RegisteredPanel } from "@mirante/core";
import type { MapFacade } from "@mirante/map";
import { useTranslation } from "react-i18next";

import { CloseIcon } from "./Icons";

interface ExtensionPanelHostProps {
  map: MapFacade;
  panel: RegisteredPanel;
  onClose: () => void;
}

export function ExtensionPanelHost({
  map,
  panel,
  onClose,
}: ExtensionPanelHostProps) {
  const { t } = useTranslation(panel.translationNamespace);
  const { t: commonTranslation } = useTranslation("common");
  const Panel = panel.component;

  return (
    <aside
      className="extension-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="extension-panel-title"
    >
      <header>
        <h2 id="extension-panel-title">{t(panel.titleKey)}</h2>
        <button
          type="button"
          aria-label={commonTranslation("shell.panel.close")}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </header>
      <div className="extension-panel__content">
        <Panel map={map} close={onClose} />
      </div>
    </aside>
  );
}
