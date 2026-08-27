import type { GeoNodeMapClient, GeoNodeMapSummary } from "@mirante/geonode";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

interface MapPersistenceDialogProps {
  canSave: boolean;
  client: GeoNodeMapClient;
  layerCount: number;
  onClose: () => void;
  onOpen: (id: number) => Promise<void>;
  onSave: (title: string) => Promise<void>;
}

export function MapPersistenceDialog({
  canSave,
  client,
  layerCount,
  onClose,
  onOpen,
  onSave,
}: MapPersistenceDialogProps) {
  const { t } = useTranslation("maps");
  const descriptionId = useId();
  const [title, setTitle] = useState("");
  const [maps, setMaps] = useState<readonly GeoNodeMapSummary[]>([]);
  const [listStatus, setListStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [operationError, setOperationError] = useState(false);
  const [saved, setSaved] = useState(false);
  const busy = saving || openingId !== null;

  const loadMaps = useCallback(
    async (signal?: AbortSignal) => {
      setListStatus("loading");
      try {
        const page = await client.listMaps({ pageSize: 50, signal });
        setMaps(page.maps);
        setListStatus("ready");
      } catch {
        if (!signal?.aborted) setListStatus("error");
      }
    },
    [client],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadMaps(controller.signal);
    return () => controller.abort();
  }, [loadMaps]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || busy) return;
    setSaving(true);
    setSaved(false);
    setOperationError(false);
    try {
      await onSave(normalizedTitle);
      setTitle("");
      setSaved(true);
      await loadMaps();
    } catch {
      setOperationError(true);
    } finally {
      setSaving(false);
    }
  }

  async function open(id: number) {
    if (busy) return;
    setOpeningId(id);
    setOperationError(false);
    try {
      await onOpen(id);
      onClose();
    } catch {
      setOperationError(true);
      setOpeningId(null);
    }
  }

  return (
    <div className="map-library-backdrop">
      <section
        className="map-library-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-library-title"
        aria-describedby={descriptionId}
      >
        <header>
          <div>
            <p className="map-library-dialog__eyebrow">{t("dialog.eyebrow")}</p>
            <h2 id="map-library-title">{t("dialog.title")}</h2>
            <p id={descriptionId}>{t("dialog.description")}</p>
          </div>
          <button
            type="button"
            className="map-library-dialog__close"
            aria-label={t("dialog.close")}
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {canSave ? (
          <form
            className="map-library-save"
            onSubmit={(event) => void save(event)}
          >
            <div>
              <label htmlFor="map-title">{t("save.title")}</label>
              <p>{t("save.help", { count: layerCount })}</p>
            </div>
            <div className="map-library-save__controls">
              <input
                id="map-title"
                type="text"
                maxLength={255}
                required
                value={title}
                placeholder={t("save.placeholder")}
                disabled={busy}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
              <button
                className="button button--primary"
                type="submit"
                disabled={busy || !title.trim()}
              >
                {saving ? t("save.saving") : t("save.action")}
              </button>
            </div>
            {saved ? (
              <p
                className="map-library-message map-library-message--success"
                role="status"
              >
                {t("save.success")}
              </p>
            ) : null}
          </form>
        ) : (
          <p className="map-library-permission">{t("save.permission")}</p>
        )}

        <div className="map-library-list">
          <h3>{t("list.title")}</h3>
          {listStatus === "loading" ? (
            <p role="status">{t("list.loading")}</p>
          ) : null}
          {listStatus === "error" ? (
            <div className="map-library-list__state" role="alert">
              <p>{t("list.error")}</p>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void loadMaps()}
              >
                {t("list.retry")}
              </button>
            </div>
          ) : null}
          {listStatus === "ready" && maps.length === 0 ? (
            <p>{t("list.empty")}</p>
          ) : null}
          {listStatus === "ready" && maps.length > 0 ? (
            <ul>
              {maps.map((savedMap) => (
                <li key={savedMap.id}>
                  <div>
                    <strong>{savedMap.title}</strong>
                    <span>GeoNode #{savedMap.id}</span>
                  </div>
                  <button
                    type="button"
                    className="button button--secondary"
                    disabled={busy}
                    onClick={() => void open(savedMap.id)}
                  >
                    {openingId === savedMap.id
                      ? t("list.opening")
                      : t("list.open")}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {operationError ? (
          <p
            className="map-library-message map-library-message--error"
            role="alert"
          >
            {t("errors.operation")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
