import { formatFileSize } from "@mirante/i18n";
import type {
  DatasetUploadVisibility,
  GeoNodeGroup,
  UploadDatasetOptions,
} from "@mirante/geonode";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
  type DatasetFileValidationErrorCode,
  defaultMaximumDatasetFileSize,
  validateDatasetFile,
} from "./fileValidation";

export type UploadWorkflowStatus =
  | "error"
  | "idle"
  | "processing"
  | "success"
  | "uploading";

export interface UploadWorkflowState {
  status: UploadWorkflowStatus;
  progress: number;
  stage?:
    | "metadata"
    | "permissions"
    | "processing"
    | "retrieving"
    | "styling"
    | "uploading";
  errorCode?: string;
  errorDetail?: string;
  datasetTitle?: string;
}

interface DatasetUploadDialogProps {
  groups?: readonly GeoNodeGroup[];
  groupsLoading?: boolean;
  groupsUnavailable?: boolean;
  maximumFileSize?: number;
  state: UploadWorkflowState;
  onClose: () => void;
  onUpload: (
    file: File,
    customizations: Pick<
      UploadDatasetOptions,
      "metadata" | "style" | "visibility"
    >,
  ) => void;
  visibilityControlEnabled?: boolean;
}

export function DatasetUploadDialog({
  groups = [],
  groupsLoading = false,
  groupsUnavailable = false,
  maximumFileSize = defaultMaximumDatasetFileSize,
  onClose,
  onUpload,
  state,
  visibilityControlEnabled = false,
}: DatasetUploadDialogProps) {
  const { t } = useTranslation("upload");
  const descriptionId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] =
    useState<DatasetFileValidationErrorCode | null>(null);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [geometryStyle, setGeometryStyle] = useState<
    "default" | "point" | "polygon"
  >("default");
  const [fillColor, setFillColor] = useState("#14b8a6");
  const [strokeColor, setStrokeColor] = useState("#0f172a");
  const [pointShape, setPointShape] = useState<"circle" | "square">("circle");
  const [visibilityAccess, setVisibilityAccess] =
    useState<DatasetUploadVisibility["access"]>("private");
  const [visibilityGroupId, setVisibilityGroupId] = useState("");
  const busy = state.status === "uploading" || state.status === "processing";

  useEffect(() => {
    if (
      visibilityAccess === "group" &&
      !groups.some((group) => String(group.id) === visibilityGroupId) &&
      groups[0]
    ) {
      setVisibilityGroupId(String(groups[0].id));
    }
  }, [groups, visibilityAccess, visibilityGroupId]);

  async function selectFile(selectedFile: File | null) {
    setFile(selectedFile);
    setValidationError(
      selectedFile
        ? await validateDatasetFile(selectedFile, maximumFileSize)
        : null,
    );
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void selectFile(event.currentTarget.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    if (!busy) {
      void selectFile(event.dataTransfer.files[0] ?? null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (file && !validationError && !busy) {
      const trimmedTitle = title.trim();
      const trimmedAbstract = abstract.trim();
      const metadata =
        trimmedTitle || trimmedAbstract
          ? {
              ...(trimmedTitle ? { title: trimmedTitle } : {}),
              ...(trimmedAbstract ? { abstract: trimmedAbstract } : {}),
            }
          : undefined;
      const style =
        geometryStyle === "default"
          ? undefined
          : geometryStyle === "polygon"
            ? {
                geometry: "polygon" as const,
                fillColor,
                strokeColor,
              }
            : {
                geometry: "point" as const,
                fillColor,
                strokeColor,
                shape: pointShape,
              };
      const selectedGroup = groups.find(
        (group) => String(group.id) === visibilityGroupId,
      );
      const visibility: DatasetUploadVisibility | undefined =
        !visibilityControlEnabled
          ? undefined
          : visibilityAccess === "group"
            ? selectedGroup
              ? { access: "group", groupId: selectedGroup.id }
              : undefined
            : { access: visibilityAccess };

      if (
        visibilityControlEnabled &&
        visibilityAccess === "group" &&
        !visibility
      ) {
        return;
      }

      onUpload(file, { metadata, style, visibility });
    }
  }

  return (
    <div className="upload-backdrop">
      <section
        className="upload-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
        aria-describedby={descriptionId}
      >
        <header>
          <div>
            <p className="upload-dialog__eyebrow">{t("dialog.eyebrow")}</p>
            <h2 id="upload-dialog-title">{t("dialog.title")}</h2>
            <p id={descriptionId}>{t("dialog.description")}</p>
          </div>
          <button
            type="button"
            className="upload-dialog__close"
            aria-label={t("dialog.close")}
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {state.status === "success" ? (
            <div className="upload-result upload-result--success" role="status">
              <span aria-hidden="true">✓</span>
              <div>
                <h3>{t("success.title")}</h3>
                <p>{t("success.description", { name: state.datasetTitle })}</p>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`upload-dropzone${dragging ? " upload-dropzone--dragging" : ""}${validationError ? " upload-dropzone--invalid" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <span className="upload-dropzone__icon" aria-hidden="true">
                  ↑
                </span>
                <strong>{file ? file.name : t("dropzone.prompt")}</strong>
                <p>
                  {file
                    ? formatFileSize(file.size)
                    : t("dropzone.help", {
                        size: formatFileSize(maximumFileSize),
                      })}
                </p>
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept=".geojson,.kml,.zip,application/geo+json,application/vnd.google-earth.kml+xml,application/zip,application/x-zip-compressed"
                  disabled={busy}
                  onChange={handleFileInput}
                />
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? t("dropzone.replace") : t("dropzone.browse")}
                </button>
              </div>

              {validationError ? (
                <p
                  className="upload-message upload-message--error"
                  role="alert"
                >
                  {t(`validation.${validationError}`)}
                </p>
              ) : file ? (
                <p
                  className="upload-message upload-message--valid"
                  role="status"
                >
                  {t("validation.valid")}
                </p>
              ) : null}

              <fieldset className="upload-options" disabled={busy}>
                <legend>{t("metadata.legend")}</legend>
                <p>{t("metadata.help")}</p>
                <label>
                  <span>{t("metadata.title")}</span>
                  <input
                    type="text"
                    maxLength={255}
                    value={title}
                    placeholder={t("metadata.titlePlaceholder")}
                    onChange={(event) => setTitle(event.currentTarget.value)}
                  />
                </label>
                <label>
                  <span>{t("metadata.abstract")}</span>
                  <textarea
                    rows={3}
                    value={abstract}
                    placeholder={t("metadata.abstractPlaceholder")}
                    onChange={(event) => setAbstract(event.currentTarget.value)}
                  />
                </label>
              </fieldset>

              {visibilityControlEnabled ? (
                <fieldset className="upload-options" disabled={busy}>
                  <legend>{t("visibility.legend")}</legend>
                  <p>{t("visibility.help")}</p>
                  <label>
                    <span>{t("visibility.access")}</span>
                    <select
                      value={visibilityAccess}
                      onChange={(event) =>
                        setVisibilityAccess(
                          event.currentTarget
                            .value as DatasetUploadVisibility["access"],
                        )
                      }
                    >
                      <option value="private">{t("visibility.private")}</option>
                      <option value="public">{t("visibility.public")}</option>
                      <option
                        value="group"
                        disabled={
                          groupsLoading ||
                          groupsUnavailable ||
                          groups.length === 0
                        }
                      >
                        {t("visibility.group")}
                      </option>
                    </select>
                  </label>
                  {visibilityAccess === "group" ? (
                    <label>
                      <span>{t("visibility.groupLabel")}</span>
                      <select
                        value={visibilityGroupId}
                        disabled={groupsLoading || groupsUnavailable}
                        onChange={(event) =>
                          setVisibilityGroupId(event.currentTarget.value)
                        }
                      >
                        {groups.map((group) => (
                          <option value={group.id} key={group.id}>
                            {group.title}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {groupsLoading ? (
                    <p>{t("visibility.loadingGroups")}</p>
                  ) : null}
                  {groupsUnavailable ? (
                    <p role="alert">{t("visibility.groupsUnavailable")}</p>
                  ) : !groupsLoading && groups.length === 0 ? (
                    <p>{t("visibility.noGroups")}</p>
                  ) : null}
                </fieldset>
              ) : null}

              <fieldset className="upload-options" disabled={busy}>
                <legend>{t("style.legend")}</legend>
                <p>{t("style.help")}</p>
                <label>
                  <span>{t("style.geometry")}</span>
                  <select
                    value={geometryStyle}
                    onChange={(event) =>
                      setGeometryStyle(
                        event.currentTarget.value as typeof geometryStyle,
                      )
                    }
                  >
                    <option value="default">{t("style.default")}</option>
                    <option value="polygon">{t("style.polygon")}</option>
                    <option value="point">{t("style.point")}</option>
                  </select>
                </label>
                {geometryStyle !== "default" ? (
                  <div className="upload-style-grid">
                    {geometryStyle === "point" ? (
                      <label>
                        <span>{t("style.pointShape")}</span>
                        <select
                          value={pointShape}
                          onChange={(event) =>
                            setPointShape(
                              event.currentTarget.value as typeof pointShape,
                            )
                          }
                        >
                          <option value="circle">{t("style.circle")}</option>
                          <option value="square">{t("style.square")}</option>
                        </select>
                      </label>
                    ) : null}
                    <label>
                      <span>{t("style.fillColor")}</span>
                      <input
                        type="color"
                        value={fillColor}
                        onChange={(event) =>
                          setFillColor(event.currentTarget.value)
                        }
                      />
                    </label>
                    <label>
                      <span>{t("style.strokeColor")}</span>
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(event) =>
                          setStrokeColor(event.currentTarget.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </fieldset>

              {busy ? (
                <div className="upload-progress" role="status">
                  <div>
                    <strong>
                      {t(`progress.${state.stage ?? "uploading"}`)}
                    </strong>
                    <span>
                      {t("progress.percentage", { value: state.progress })}
                    </span>
                  </div>
                  <progress max="100" value={state.progress} />
                  <p>{t("progress.keepOpen")}</p>
                </div>
              ) : null}

              {state.status === "error" ? (
                <div
                  className="upload-result upload-result--error"
                  role="alert"
                >
                  <span aria-hidden="true">!</span>
                  <div>
                    <h3>{t("errors.title")}</h3>
                    <p>
                      {t(`errors.${state.errorCode ?? "unexpected-response"}`)}
                    </p>
                    {state.errorDetail ? (
                      <small>{state.errorDetail}</small>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}

          <footer>
            <button
              type="button"
              className="button button--secondary"
              disabled={busy}
              onClick={onClose}
            >
              {state.status === "success"
                ? t("actions.done")
                : t("actions.cancel")}
            </button>
            {state.status !== "success" ? (
              <button
                type="submit"
                className="button button--primary"
                disabled={
                  !file ||
                  Boolean(validationError) ||
                  busy ||
                  (visibilityControlEnabled &&
                    visibilityAccess === "group" &&
                    !groups.some(
                      (group) => String(group.id) === visibilityGroupId,
                    ))
                }
              >
                {busy ? t("actions.working") : t("actions.upload")}
              </button>
            ) : null}
          </footer>
        </form>
      </section>
    </div>
  );
}
