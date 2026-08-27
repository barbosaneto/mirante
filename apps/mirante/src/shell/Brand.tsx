import { useTranslation } from "react-i18next";

import miranteLogo from "../assets/mirante.png";

export function Brand() {
  const { t } = useTranslation("common");

  return (
    <div className="brand" aria-label={t("application.name")}>
      <img className="brand__logo" src={miranteLogo} alt="" />
      <span className="brand__name">{t("application.name")}</span>
    </div>
  );
}
