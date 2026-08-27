import { createMap, type MapFacade } from "@mirante/map";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { mirante } from "./mirante";
import { ActionDock } from "./shell/ActionDock";
import { Brand } from "./shell/Brand";
import { LanguageSelector } from "./shell/LanguageSelector";
import { LayersPanel } from "./shell/LayersPanel";
import { UserArea } from "./shell/UserArea";

export function App() {
  const { t } = useTranslation("map");
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapFacade | null>(null);
  const { config } = mirante;

  const themeStyle: CSSProperties & Record<`--mirante-${string}`, string> = {
    "--mirante-color-primary": config.theme.primaryColor,
    "--mirante-color-primary-strong": config.theme.primaryColorStrong,
  };

  useEffect(() => {
    const target = mapTargetRef.current;

    if (!target) {
      return;
    }

    const mapFacade = createMap({
      target,
      initialCenter: config.map.initialCenter,
      initialZoom: config.map.initialZoom,
    });

    setMap(mapFacade);

    return () => {
      mapFacade.destroy();
    };
  }, [config.map.initialCenter, config.map.initialZoom]);

  useEffect(() => {
    document.title = config.branding.applicationName;
  }, [config.branding.applicationName]);

  return (
    <main className="app-shell" style={themeStyle}>
      <div
        ref={mapTargetRef}
        className="map-viewport"
        role="region"
        aria-label={t("ariaLabel")}
        tabIndex={0}
      />
      <Brand
        applicationName={config.branding.applicationName}
        logoUrl={config.branding.logoUrl}
      />
      <LayersPanel />
      <LanguageSelector locales={config.i18n.supportedLocales} />
      <UserArea />
      <ActionDock actions={mirante.mapToolbar} map={map} />
    </main>
  );
}
