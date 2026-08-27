import { formatFileSize } from "@mirante/i18n";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
  type DatasetFileValidationErrorCode,
  maximumDatasetFileSize,
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
  stage?: "processing" | "retrieving" | "uploading";
  errorCode?: string;
  errorDetail?: string;
  datasetTitle?: string;
}

interface DatasetUploadDialogProps {
  state: UploadWorkflowState;
  onClose: () => void;
  onUpload: (file: File) => void;
}

export function DatasetUploadDialog({
  onClose,
  onUpload,
  state,
}: DatasetUploadDialogProps) {
  const { t } = useTranslation("upload");
  const descriptionId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] =
    useState<DatasetFileValidationErrorCode | null>(null);
  const busy = state.status === "uploading" || state.status === "processing";

  async function selectFile(selectedFile: File | null) {
    setFile(selectedFile);
    setValidationError(
      selectedFile ? await validateDatasetFile(selectedFile) : null,
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
      onUpload(file);
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
                        size: formatFileSize(maximumDatasetFileSize),
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
                disabled={!file || Boolean(validationError) || busy}
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
