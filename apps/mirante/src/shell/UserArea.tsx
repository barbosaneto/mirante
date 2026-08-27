import { useTranslation } from "react-i18next";

import { UserIcon } from "./Icons";

export function UserArea() {
  const { t } = useTranslation("common");

  return (
    <div className="user-area" aria-label={t("shell.user.areaLabel")}>
      <span className="shell-icon">
        <UserIcon />
      </span>
      <span className="user-area__label">{t("shell.user.guest")}</span>
    </div>
  );
}
