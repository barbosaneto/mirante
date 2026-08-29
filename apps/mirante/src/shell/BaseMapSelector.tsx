import type { BaseMapId, MapFacade } from "@mirante/map";
import { type FocusEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { GlobeIcon } from "./Icons";

interface BaseMapSelectorProps {
  baseMap: BaseMapId;
  map: MapFacade | null;
  onChange: (id: BaseMapId) => void;
}

export function BaseMapSelector({
  baseMap,
  map,
  onChange,
}: BaseMapSelectorProps) {
  const { t } = useTranslation("map");
  const selectId = useId();
  const [open, setOpen] = useState(false);

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
              const selectedBaseMap = event.currentTarget.value as BaseMapId;
              onChange(selectedBaseMap);
              setOpen(false);
            }}
          >
            <option value="dark-matter">{t("baseMap.darkMatter")}</option>
            <option value="open-street-map">
              {t("baseMap.openStreetMap")}
            </option>
          </select>
        </div>
      ) : null}
    </div>
  );
}
