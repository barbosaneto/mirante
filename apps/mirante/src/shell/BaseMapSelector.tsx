import { getActiveLocale } from "@mirante/i18n";
import type { MapFacade } from "@mirante/map";
import type { BaseMapDefinition, BaseMapId } from "@mirante/sdk";
import { type FocusEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { GlobeIcon } from "./Icons";

interface BaseMapSelectorProps {
  baseMap: BaseMapId;
  baseMaps: readonly BaseMapDefinition[];
  fallbackLocale: string;
  map: MapFacade | null;
  onChange: (id: BaseMapId) => void;
}

export function BaseMapSelector({
  baseMap,
  baseMaps,
  fallbackLocale,
  map,
  onChange,
}: BaseMapSelectorProps) {
  const { t } = useTranslation("map");
  const selectId = useId();
  const [open, setOpen] = useState(false);
  const activeLocale = getActiveLocale();

  function closeWhenFocusLeaves(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  return (
    <div className="base-map-selector" onBlur={closeWhenFocusLeaves}>
      <button
        type="button"
        aria-controls={selectId}
        aria-expanded={open}
        aria-label={t("baseMap.open")}
        title={t("baseMap.open")}
        disabled={!map}
        onClick={() => setOpen((current) => !current)}
      >
        <GlobeIcon />
      </button>
      {open ? (
        <div className="base-map-selector__popover">
          <label htmlFor={selectId}>{t("baseMap.label")}</label>
          <select
            id={selectId}
            autoFocus
            value={baseMap}
            aria-label={t("baseMap.label")}
            onChange={(event) => {
              const selectedBaseMap = event.currentTarget.value;
              onChange(selectedBaseMap);
              setOpen(false);
            }}
          >
            {baseMaps.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.labels[activeLocale] ??
                  definition.labels[fallbackLocale] ??
                  Object.values(definition.labels)[0] ??
                  definition.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
