import { createMap } from "@mirante/map";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { ActionDock } from "./shell/ActionDock";
import { Brand } from "./shell/Brand";
import { LayersPanel } from "./shell/LayersPanel";
import { UserArea } from "./shell/UserArea";

export function App() {
  const { t } = useTranslation("common");
  const mapTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = mapTargetRef.current;

    if (!target) {
      return;
    }

    const map = createMap({ target });

    return () => {
      map.destroy();
    };
  }, []);

  return (
    <main className="app-shell">
      <div
        ref={mapTargetRef}
        className="map-viewport"
        role="region"
        aria-label={t("map.ariaLabel")}
        tabIndex={0}
      />
      <Brand />
      <LayersPanel />
      <UserArea />
      <ActionDock />
    </main>
  );
}
