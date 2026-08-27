import { useTranslation } from "react-i18next";

import { DrawIcon, MeasureIcon, PointerIcon } from "./Icons";

export function ActionDock() {
  const { t } = useTranslation("common");

  const actions = [
    { id: "inspect", label: t("shell.tools.inspect"), icon: <PointerIcon /> },
    { id: "measure", label: t("shell.tools.measure"), icon: <MeasureIcon /> },
    { id: "draw", label: t("shell.tools.draw"), icon: <DrawIcon /> },
  ];

  return (
    <div
      className="action-dock"
      role="toolbar"
      aria-label={t("shell.tools.toolbarLabel")}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          aria-label={action.label}
          title={action.label}
          disabled
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
