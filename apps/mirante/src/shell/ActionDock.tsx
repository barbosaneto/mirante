import type { MapFacade } from "@mirante/map";
import type { RegisteredToolbarItem } from "@mirante/core";
import { useTranslation } from "react-i18next";

import { GlobeIcon, HomeIcon } from "./Icons";

const icons = {
  globe: <GlobeIcon />,
  home: <HomeIcon />,
} as const;

interface ActionDockProps {
  actions: readonly RegisteredToolbarItem[];
  map: MapFacade | null;
}

export function ActionDock({ actions, map }: ActionDockProps) {
  const { t } = useTranslation("common");

  return (
    <div
      className="action-dock"
      role="toolbar"
      aria-label={t("shell.tools.toolbarLabel")}
    >
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
            disabled={!map}
            onClick={() => {
              if (map) {
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
