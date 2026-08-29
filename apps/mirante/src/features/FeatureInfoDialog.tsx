import type { DatasetFeatureInfo, FeatureInfoEvent } from "@mirante/map";
import { formatNumber } from "@mirante/i18n";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { CloseIcon } from "../shell/Icons";

interface FeatureInfoDialogProps {
  result: FeatureInfoEvent;
  onClose: () => void;
}

function formatAttributeValue(
  value: unknown,
  trueLabel: string,
  falseLabel: string,
  emptyLabel: string,
): string {
  if (value === null || value === undefined || value === "") return emptyLabel;
  if (typeof value === "boolean") return value ? trueLabel : falseLabel;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value) || emptyLabel;
  return emptyLabel;
}

function FeatureAttributes({ feature }: { feature: DatasetFeatureInfo }) {
  const { t } = useTranslation("featureInfo");
  const attributes = Object.entries(feature.attributes);

  return (
    <section className="feature-info__feature">
      <header>
        <div>
          <h3>{feature.datasetTitle}</h3>
          {feature.featureId ? (
            <p>{t("featureId", { id: feature.featureId })}</p>
          ) : null}
        </div>
      </header>
      {attributes.length > 0 ? (
        <div className="feature-info__table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("attribute")}</th>
                <th scope="col">{t("value")}</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map(([name, value]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  <td>
                    {formatAttributeValue(
                      value,
                      t("values.true"),
                      t("values.false"),
                      t("values.empty"),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="feature-info__state">{t("noAttributes")}</p>
      )}
    </section>
  );
}

export function FeatureInfoDialog({ result, onClose }: FeatureInfoDialogProps) {
  const { t } = useTranslation("featureInfo");
  const descriptionId = useId();

  return (
    <div className="feature-info-backdrop">
      <section
        className="feature-info-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-info-title"
        aria-describedby={descriptionId}
      >
        <header className="feature-info-dialog__header">
          <div>
            <p className="feature-info-dialog__eyebrow">{t("eyebrow")}</p>
            <h2 id="feature-info-title">{t("title")}</h2>
            <p id={descriptionId}>{t("description")}</p>
          </div>
          <button
            type="button"
            className="feature-info-dialog__close"
            aria-label={t("close")}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="feature-info-dialog__content">
          {result.status === "loading" ? (
            <p className="feature-info__state" role="status">
              {t("loading")}
            </p>
          ) : null}
          {result.status === "error" ? (
            <p
              className="feature-info__state feature-info__state--error"
              role="alert"
            >
              {t("error")}
            </p>
          ) : null}
          {result.status === "ready" && result.features.length === 0 ? (
            <p className="feature-info__state">{t("empty")}</p>
          ) : null}
          {result.status === "ready"
            ? result.features.map((feature, index) => (
                <FeatureAttributes
                  key={`${feature.datasetId}:${feature.featureId ?? index}`}
                  feature={feature}
                />
              ))
            : null}
        </div>
      </section>
    </div>
  );
}
