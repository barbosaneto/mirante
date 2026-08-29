import type { GeoNodeMapClient, GeoNodeMapSummary } from "@mirante/geonode";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { CloseIcon } from "../shell/Icons";

const pageSize = 8;

interface MapPersistenceDialogProps {
  activeMap: GeoNodeMapSummary | null;
  canCreate: boolean;
  canEditActive: boolean;
  client: GeoNodeMapClient;
  layerCount: number;
  onClose: () => void;
  onOpen: (id: number) => Promise<void>;
  onSave: (title: string) => Promise<void>;
  onUpdate: (id: number, title: string) => Promise<void>;
}

export function MapPersistenceDialog({
  activeMap,
  canCreate,
  canEditActive,
  client,
  layerCount,
  onClose,
  onOpen,
  onSave,
  onUpdate,
}: MapPersistenceDialogProps) {
  const { t } = useTranslation("maps");
  const descriptionId = useId();
  const searchId = useId();
  const [title, setTitle] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [maps, setMaps] = useState<readonly GeoNodeMapSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listStatus, setListStatus] = useState<"error" | "loading" | "ready">(
    "loading",
  );
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [operationError, setOperationError] = useState(false);
  const [success, setSuccess] = useState<"created" | "updated" | null>(null);
  const busy = saving || updating || openingId !== null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const loadMaps = useCallback(
    async (signal?: AbortSignal) => {
      setListStatus("loading");
      try {
        const result = await client.listMaps({
          page,
          pageSize,
          search,
          signal,
        });
        setMaps(result.maps);
        setTotal(result.total);
        setListStatus("ready");
      } catch {
        if (!signal?.aborted) setListStatus("error");
      }
    },
    [client, page, search],
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
    setSuccess(null);
    setOperationError(false);
    try {
      await onSave(normalizedTitle);
      setTitle("");
      setPage(1);
      setSearch("");
      setSearchInput("");
      setSuccess("created");
      await loadMaps();
    } catch {
      setOperationError(true);
    } finally {
      setSaving(false);
    }
  }

  async function update() {
    if (!activeMap || busy) return;
    setUpdating(true);
    setSuccess(null);
    setOperationError(false);
    try {
      await onUpdate(activeMap.id, activeMap.title);
      setSuccess("updated");
      await loadMaps();
    } catch {
      setOperationError(true);
    } finally {
      setUpdating(false);
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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
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
            <CloseIcon />
          </button>
        </header>

        {canCreate || canEditActive ? (
          <div className="map-library-write-actions">
            {activeMap && canEditActive ? (
              <section className="map-library-current">
                <div>
                  <span>{t("update.current")}</span>
                  <strong>{activeMap.title}</strong>
                </div>
                <button
                  className="button button--primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void update()}
                >
                  {updating ? t("update.updating") : t("update.action")}
                </button>
                <p>{t("update.help", { count: layerCount })}</p>
              </section>
            ) : null}
            {canCreate ? (
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
              </form>
            ) : null}
            {success ? (
              <p
                className="map-library-message map-library-message--success"
                role="status"
              >
                {t(success === "created" ? "save.success" : "update.success")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="map-library-permission">{t("save.permission")}</p>
        )}

        <div className="map-library-list">
          <h3>{t("list.title")}</h3>
          <form className="map-library-search" onSubmit={submitSearch}>
            <label className="visually-hidden" htmlFor={searchId}>
              {t("list.searchLabel")}
            </label>
            <input
              id={searchId}
              type="search"
              value={searchInput}
              placeholder={t("list.searchPlaceholder")}
              disabled={busy}
              onChange={(event) => setSearchInput(event.currentTarget.value)}
            />
            <button className="button button--secondary" type="submit">
              {t("list.searchAction")}
            </button>
          </form>
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
            <p>{t(search ? "list.noResults" : "list.empty")}</p>
          ) : null}
          {listStatus === "ready" && maps.length > 0 ? (
            <>
              <ul>
                {maps.map((savedMap) => (
                  <li
                    key={savedMap.id}
                    className={
                      activeMap?.id === savedMap.id
                        ? "map-library-list__active"
                        : undefined
                    }
                  >
                    <div>
                      <strong>{savedMap.title}</strong>
                      <span>
                        GeoNode #{savedMap.id}
                        {activeMap?.id === savedMap.id
                          ? ` · ${t("list.current")}`
                          : ""}
                      </span>
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
              <nav
                className="map-library-pagination"
                aria-label={t("list.paginationLabel")}
              >
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={busy || page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  {t("list.previous")}
                </button>
                <span>{t("list.page", { page, pageCount, total })}</span>
                <button
                  type="button"
                  className="button button--secondary"
                  disabled={busy || page >= pageCount}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("list.next")}
                </button>
              </nav>
            </>
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
