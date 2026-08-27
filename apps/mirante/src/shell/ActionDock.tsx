import type { MapFacade } from "@mirante/map";
import type { RegisteredToolbarItem } from "@mirante/core";
import { useTranslation } from "react-i18next";

import { GlobeIcon, HomeIcon, UploadIcon } from "./Icons";

const icons = {
  globe: <GlobeIcon />,
  home: <HomeIcon />,
} as const;

interface ActionDockProps {
  actions: readonly RegisteredToolbarItem[];
  authenticated: boolean;
  canUploadDatasets: boolean;
  map: MapFacade | null;
  uploadEnabled: boolean;
  onUpload: () => void;
}

export function ActionDock({
  actions,
  authenticated,
  canUploadDatasets,
  map,
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
                action.onClick({ map });
              }
            }}
          >
            {icons[action.icon]}
          </button>
        );
      })}
    </div>
  );
}
