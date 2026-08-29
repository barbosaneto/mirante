import type { BaseMapId, MapFacade } from "@mirante/map";
import type { RegisteredToolbarItem } from "@mirante/core";
import type { BaseMapDefinition } from "@mirante/sdk";
import { createElement } from "react";
import { useTranslation } from "react-i18next";

import { BaseMapSelector } from "./BaseMapSelector";
import { GlobeIcon, HomeIcon, MapLibraryIcon, UploadIcon } from "./Icons";

const icons = {
  globe: <GlobeIcon />,
  home: <HomeIcon />,
} as const;

interface ActionDockProps {
  actions: readonly RegisteredToolbarItem[];
  authenticated: boolean;
  baseMap: BaseMapId;
  baseMaps: readonly BaseMapDefinition[];
  canUploadDatasets: boolean;
  fallbackLocale: string;
  map: MapFacade | null;
  uploadEnabled: boolean;
  onMaps: () => void;
  onBaseMapChange: (id: BaseMapId) => void;
  onClosePanel: () => void;
  onOpenPanel: (id: string) => void;
  onUpload: () => void;
}

export function ActionDock({
  actions,
  authenticated,
  baseMap,
  baseMaps,
  canUploadDatasets,
  fallbackLocale,
  map,
  onMaps,
  onBaseMapChange,
  onClosePanel,
  onOpenPanel,
  onUpload,
  uploadEnabled,
}: ActionDockProps) {
  const { t } = useTranslation("common");
  const { t: uploadTranslation } = useTranslation("upload");

  return (
    <div
      className="action-dock"
      role="toolbar"
      aria-label={t("shell.tools.toolbarLabel")}
    >
      {authenticated ? (
        <button
          type="button"
          aria-label={t("toolbarLabel", { ns: "maps" })}
          title={t("toolbarLabel", { ns: "maps" })}
          disabled={!map}
          onClick={onMaps}
        >
          <MapLibraryIcon />
        </button>
      ) : null}
      {uploadEnabled && canUploadDatasets ? (
        <button
          type="button"
          aria-label={uploadTranslation("toolbarLabel")}
          title={uploadTranslation("toolbarLabel")}
          disabled={!map}
          onClick={onUpload}
        >
          <UploadIcon />
        </button>
      ) : null}
      {actions.map((action) => {
        const label = t(action.labelKey, {
          ns: action.translationNamespace,
        });

        return (
          <button
            key={`${action.extensionId}:${action.id}`}
            type="button"
            aria-label={label}
            title={label}
            disabled={
              !map || (action.requiresAuthentication === true && !authenticated)
            }
            onClick={() => {
              if (
                map &&
                (action.requiresAuthentication !== true || authenticated)
              ) {
                action.onClick({
                  map,
                  ui: {
                    closePanel: onClosePanel,
                    openPanel: onOpenPanel,
                  },
                });
              }
            }}
          >
            {typeof action.icon === "string"
              ? icons[action.icon]
              : createElement(action.icon)}
          </button>
        );
      })}
      <BaseMapSelector
        baseMap={baseMap}
        baseMaps={baseMaps}
        fallbackLocale={fallbackLocale}
        map={map}
        onChange={onBaseMapChange}
      />
    </div>
  );
}
