import {
  createGeoNodeAuthenticationClient,
  createGeoNodeDatasetClient,
  createGeoNodeMapClient,
  GeoNodeDatasetIngestionError,
  serializeGeoNodeAttributeFilter,
  type GeoNodeAttributeFilter,
  type GeoNodeAuthenticationClient,
  type GeoNodeDataset,
  type GeoNodeDatasetClient,
  type GeoNodeGroup,
  type GeoNodeMapClient,
  type GeoNodeMapSummary,
  type UploadDatasetOptions,
} from "@mirante/geonode";
import type {
  MiranteConfig,
  RegisteredAuthenticationProvider,
} from "@mirante/core";
import {
  isExtensionAccessAllowed,
  type MiranteCapabilitySet,
} from "@mirante/sdk";
import {
  createMap,
  type BaseMapId,
  type DatasetFeatureInfo,
  type FeatureInfoEvent,
  type MapFacade,
} from "@mirante/map";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "./auth/AuthenticationContext";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { createAuthenticationProviderUrl } from "./auth/providerUrl";
import { SignInPanel } from "./auth/SignInPanel";
import { AttributeTable } from "./features/AttributeTable";
import { FeatureInfoDialog } from "./features/FeatureInfoDialog";
import { mirante } from "./mirante";
import { MapPersistenceDialog } from "./maps/MapPersistenceDialog";
import { ActionDock } from "./shell/ActionDock";
import { Brand } from "./shell/Brand";
import { DatasetCatalogDrawer } from "./shell/DatasetCatalogDrawer";
import { ExtensionPanelHost } from "./shell/ExtensionPanelHost";
import { LanguageSelector } from "./shell/LanguageSelector";
import { type DisplayedDataset, LayersPanel } from "./shell/LayersPanel";
import { UserArea } from "./shell/UserArea";
import {
  DatasetUploadDialog,
  type UploadWorkflowState,
} from "./upload/DatasetUploadDialog";

const defaultAuthenticationClient = createGeoNodeAuthenticationClient({
  baseUrl: mirante.config.geonode.baseUrl,
});

const defaultDatasetClient = createGeoNodeDatasetClient({
  baseUrl: mirante.config.geonode.baseUrl,
});

const defaultMapClient = createGeoNodeMapClient({
  baseUrl: mirante.config.geonode.baseUrl,
});

const initialUploadState: UploadWorkflowState = {
  status: "idle",
  progress: 0,
};

type SelectedFeature = Pick<
  DatasetFeatureInfo,
  "datasetId" | "featureId" | "geometry"
>;

type UploadGroupsState =
  | { status: "error" | "idle" | "loading"; groups: readonly GeoNodeGroup[] }
  | { status: "ready"; groups: readonly GeoNodeGroup[] };

function publicIngestionErrorDetail(error: unknown): string | undefined {
  if (!(error instanceof GeoNodeDatasetIngestionError)) return undefined;
  const withoutControls = Array.from(error.message, (character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
      code === 127
      ? " "
      : character;
  }).join("");
  const detail = withoutControls.replace(/\s+/g, " ").trim();
  return detail ? detail.slice(0, 700) : undefined;
}

function createThemeStyle(
  theme: MiranteConfig["theme"],
): CSSProperties & Record<`--mirante-${string}`, string> {
  return {
    "--mirante-color-primary": theme.primaryColor,
    "--mirante-color-primary-strong": theme.primaryColorStrong,
    "--mirante-color-primary-contrast": theme.primaryContrastColor,
    "--mirante-color-text": theme.textColor,
    "--mirante-color-text-muted": theme.textMutedColor,
    "--mirante-color-surface": theme.surfaceColor,
    "--mirante-color-panel": theme.panelColor,
    "--mirante-color-panel-strong": theme.panelStrongColor,
    "--mirante-color-border": theme.borderColor,
    "--mirante-color-focus": theme.focusColor,
    "--mirante-color-success": theme.successColor,
    "--mirante-color-error": theme.errorColor,
  };
}

function startProviderSignIn(provider: RegisteredAuthenticationProvider) {
  const { geonode } = mirante.config;
  const baseUrl =
    geonode.baseUrl === "/" || geonode.baseUrl === ""
      ? window.location.origin
      : new URL(geonode.webUrl, window.location.origin).toString();
  window.location.assign(
    createAuthenticationProviderUrl({
      baseUrl,
      loginPath: provider.loginPath,
      returnUrl: window.location.href,
    }),
  );
}

function ApplicationShell({
  datasetClient,
  mapClient,
}: {
  datasetClient: GeoNodeDatasetClient;
  mapClient: GeoNodeMapClient;
}) {
  const { t } = useTranslation("map");
  const { status, user } = useAuthentication();
  const { config } = mirante;
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const activeDatasetIdsRef = useRef(new Set<number>());
  const [map, setMap] = useState<MapFacade | null>(null);
  const [datasets, setDatasets] = useState<DisplayedDataset[]>([]);
  const [datasetFilters, setDatasetFilters] = useState<
    Record<number, GeoNodeAttributeFilter>
  >({});
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueRefreshKey, setCatalogueRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mapLibraryOpen, setMapLibraryOpen] = useState(false);
  const [activeExtensionPanelId, setActiveExtensionPanelId] = useState<
    string | null
  >(null);
  const [activeSavedMap, setActiveSavedMap] =
    useState<GeoNodeMapSummary | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMapId>(
    config.map.defaultBaseMapId,
  );
  const [attributeDataset, setAttributeDataset] =
    useState<GeoNodeDataset | null>(null);
  const [featureInfo, setFeatureInfo] = useState<FeatureInfoEvent | null>(null);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
  const [uploadState, setUploadState] =
    useState<UploadWorkflowState>(initialUploadState);
  const [uploadGroupsState, setUploadGroupsState] = useState<UploadGroupsState>(
    { status: "idle", groups: [] },
  );

  const themeStyle = createThemeStyle(config.theme);
  const visibilityControlEnabled =
    config.features.datasetUploadVisibilityControl === true;

  useEffect(() => {
    const target = mapTargetRef.current;

    if (!target) {
      return;
    }

    const mapFacade = createMap({
      target,
      baseMaps: config.map.baseMaps,
      defaultBaseMapId: config.map.defaultBaseMapId,
      selectionColor: config.theme.selectionColor,
      selectionContrastColor: config.theme.selectionContrastColor,
      selectionFillColor: config.theme.selectionFillColor,
      initialCenter: config.map.initialCenter,
      initialZoom: config.map.initialZoom,
    });
    const unsubscribeFeatureInfo = mapFacade.subscribeFeatureInfo((event) => {
      setFeatureInfo(event);

      if (event.status === "ready" && event.features[0]) {
        const feature = event.features[0];
        setSelectedFeature({
          datasetId: feature.datasetId,
          ...(feature.featureId ? { featureId: feature.featureId } : {}),
          ...(feature.geometry ? { geometry: feature.geometry } : {}),
        });
        mapFacade.setSelectedFeatureGeometry(feature.geometry);
      }
    });

    setMap(mapFacade);

    return () => {
      unsubscribeFeatureInfo();
      mapFacade.destroy();
    };
  }, [
    config.map.baseMaps,
    config.map.defaultBaseMapId,
    config.map.initialCenter,
    config.map.initialZoom,
    config.theme.selectionColor,
    config.theme.selectionContrastColor,
    config.theme.selectionFillColor,
  ]);

  useEffect(() => {
    document.title = config.branding.applicationName;
  }, [config.branding.applicationName]);

  useEffect(() => {
    if (!uploadOpen || !visibilityControlEnabled || !user) {
      setUploadGroupsState({ status: "idle", groups: [] });
      return;
    }

    const controller = new AbortController();
    setUploadGroupsState({ status: "loading", groups: [] });
    void datasetClient
      .listUserGroups(user.id, controller.signal)
      .then((groups) => setUploadGroupsState({ status: "ready", groups }))
      .catch(() => {
        if (!controller.signal.aborted) {
          setUploadGroupsState({ status: "error", groups: [] });
        }
      });

    return () => controller.abort();
  }, [datasetClient, uploadOpen, user, visibilityControlEnabled]);

  function addDatasetToMap(
    dataset: GeoNodeDataset,
    options: { fit?: boolean; opacity?: number; visible?: boolean } = {},
  ) {
    if (!map || activeDatasetIdsRef.current.has(dataset.id)) {
      return;
    }

    activeDatasetIdsRef.current.add(dataset.id);
    const opacity = options.opacity ?? 1;
    const visible = options.visible ?? true;
    map.addDatasetLayer({
      ...dataset,
      fit: options.fit,
      onLoadStatusChange(loadStatus) {
        setDatasets((currentDatasets) =>
          currentDatasets.map((item) =>
            item.dataset.id === dataset.id ? { ...item, loadStatus } : item,
          ),
        );
      },
    });
    setDatasets((currentDatasets) => {
      const nextDatasets = [
        {
          dataset,
          loadStatus: "loading" as const,
          opacity,
          visible,
        },
        ...currentDatasets,
      ];
      map.setDatasetLayerOrder(nextDatasets.map((item) => item.dataset.id));
      return nextDatasets;
    });
    map.setDatasetLayerOpacity(dataset.id, opacity);
    map.setDatasetLayerVisibility(dataset.id, visible);
  }

  function currentMapInput(title: string) {
    if (!map) return null;
    return {
      baseMap,
      title,
      view: map.getView(),
      layers: datasets.map((item, order) => ({
        datasetId: item.dataset.id,
        layerName: item.dataset.layerName,
        title: item.dataset.title,
        opacity: item.opacity,
        visible: item.visible,
        order,
        ...(datasetFilters[item.dataset.id]
          ? { filter: datasetFilters[item.dataset.id] }
          : {}),
      })),
    };
  }

  async function saveMap(title: string) {
    const input = currentMapInput(title);
    if (!input) return;
    setActiveSavedMap(await mapClient.createMap(input));
  }

  async function updateMap(id: number, title: string) {
    const input = currentMapInput(title);
    if (!input) return;
    setActiveSavedMap(await mapClient.updateMap(id, input));
  }

  async function openMap(id: number) {
    if (!map) return;
    setAttributeDataset(null);
    setSelectedFeature(null);
    map.setSelectedFeatureGeometry();
    const savedMap = await mapClient.getMap(id);
    const restoredDatasets = await Promise.all(
      savedMap.layers.map(async (layer) => ({
        layer,
        dataset: await datasetClient.getDataset(layer.datasetId),
      })),
    );

    for (const item of datasets) map.removeDatasetLayer(item.dataset.id);
    activeDatasetIdsRef.current.clear();
    setDatasets([]);
    const restoredFilters: Record<number, GeoNodeAttributeFilter> = {};
    for (const { dataset, layer } of [...restoredDatasets].reverse()) {
      addDatasetToMap(dataset, {
        fit: false,
        opacity: layer.opacity,
        visible: layer.visible,
      });
      if (layer.filter) {
        restoredFilters[dataset.id] = layer.filter;
        map.setDatasetLayerFilter(
          dataset.id,
          serializeGeoNodeAttributeFilter(layer.filter),
        );
      }
    }
    setDatasetFilters(restoredFilters);
    const restoredBaseMap = config.map.baseMaps.some(
      (candidate) => candidate.id === savedMap.baseMap,
    )
      ? savedMap.baseMap
      : config.map.defaultBaseMapId;
    setBaseMap(restoredBaseMap);
    map.setBaseMap(restoredBaseMap);
    map.setView(savedMap.view);
    setActiveSavedMap(savedMap);
  }

  function changeBaseMap(id: BaseMapId) {
    setBaseMap(id);
    map?.setBaseMap(id);
  }

  async function uploadDataset(
    file: File,
    customizations: Pick<
      UploadDatasetOptions,
      "metadata" | "style" | "visibility"
    >,
  ) {
    if (!map) {
      return;
    }

    setUploadState({ status: "uploading", progress: 0, stage: "uploading" });

    try {
      const dataset = await datasetClient.uploadDataset(file, {
        ...customizations,
        onProgress(progress) {
          setUploadState({
            status: progress.stage === "uploading" ? "uploading" : "processing",
            progress: progress.percentage,
            stage: progress.stage,
          });
        },
      });
      addDatasetToMap(dataset);
      setCatalogueRefreshKey((key) => key + 1);
      setUploadState({
        status: "success",
        progress: 100,
        datasetTitle: dataset.title,
      });
    } catch (error) {
      setUploadState({
        status: "error",
        progress: 0,
        errorCode:
          error instanceof GeoNodeDatasetIngestionError
            ? error.code
            : "unexpected-response",
        errorDetail: publicIngestionErrorDetail(error),
      });
    }
  }

  function changeVisibility(id: number, visible: boolean) {
    map?.setDatasetLayerVisibility(id, visible);
    setDatasets((currentDatasets) =>
      currentDatasets.map((item) =>
        item.dataset.id === id ? { ...item, visible } : item,
      ),
    );
  }

  function changeOpacity(id: number, opacity: number) {
    map?.setDatasetLayerOpacity(id, opacity);
    setDatasets((currentDatasets) =>
      currentDatasets.map((item) =>
        item.dataset.id === id ? { ...item, opacity } : item,
      ),
    );
  }

  function removeDataset(id: number) {
    map?.removeDatasetLayer(id);
    activeDatasetIdsRef.current.delete(id);
    setAttributeDataset((current) => (current?.id === id ? null : current));
    if (selectedFeature?.datasetId === id) {
      setSelectedFeature(null);
      map?.setSelectedFeatureGeometry();
    }
    setDatasetFilters((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDatasets((currentDatasets) => {
      const nextDatasets = currentDatasets.filter(
        (item) => item.dataset.id !== id,
      );
      map?.setDatasetLayerOrder(nextDatasets.map((item) => item.dataset.id));
      return nextDatasets;
    });
  }

  function reorderDataset(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;

    setDatasets((currentDatasets) => {
      const sourceIndex = currentDatasets.findIndex(
        (item) => item.dataset.id === sourceId,
      );
      const targetIndex = currentDatasets.findIndex(
        (item) => item.dataset.id === targetId,
      );
      if (sourceIndex < 0 || targetIndex < 0) return currentDatasets;

      const nextDatasets = [...currentDatasets];
      const [movedDataset] = nextDatasets.splice(sourceIndex, 1);
      if (!movedDataset) return currentDatasets;
      nextDatasets.splice(targetIndex, 0, movedDataset);
      map?.setDatasetLayerOrder(nextDatasets.map((item) => item.dataset.id));
      return nextDatasets;
    });
  }

  function zoomToDataset(id: number) {
    map?.fitDatasetLayer(id);
  }

  function openAttributeTable(id: number) {
    const displayedDataset = datasets.find((item) => item.dataset.id === id);

    if (displayedDataset) setAttributeDataset(displayedDataset.dataset);
  }

  function changeDatasetFilter(
    id: number,
    filter: GeoNodeAttributeFilter | undefined,
  ) {
    map?.setDatasetLayerFilter(
      id,
      filter ? serializeGeoNodeAttributeFilter(filter) : undefined,
    );
    setDatasetFilters((current) => {
      if (filter) return { ...current, [id]: filter };

      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  const managementPath = config.geonode.datasetManagementPath.startsWith("/")
    ? config.geonode.datasetManagementPath
    : `/${config.geonode.datasetManagementPath}`;
  const datasetManagementUrl =
    config.geonode.webUrl === "/" || config.geonode.webUrl === ""
      ? managementPath
      : `${config.geonode.webUrl.replace(/\/$/, "")}${managementPath}`;
  const activeExtensionPanel = mirante.panels.find(
    (panel) => panel.id === activeExtensionPanelId,
  );
  const canEditCurrentMap =
    activeSavedMap !== null &&
    (activeSavedMap.canEdit || activeSavedMap.ownerId === user?.id);
  const canManageCurrentMap =
    activeSavedMap !== null &&
    (activeSavedMap.canManage || activeSavedMap.ownerId === user?.id);
  const capabilities: MiranteCapabilitySet = {
    createMaps: user?.canCreateMaps === true,
    uploadDatasets: user?.canUploadDatasets === true,
    manageGeoNode: user?.canManageGeoNode === true,
    editCurrentMap: canEditCurrentMap,
    manageCurrentMap: canManageCurrentMap,
  };
  const accessContext = {
    authenticated: status === "authenticated",
    capabilities,
  };
  const accessibleExtensionPanel =
    activeExtensionPanel &&
    isExtensionAccessAllowed(activeExtensionPanel.access, accessContext)
      ? activeExtensionPanel
      : undefined;

  useEffect(() => {
    if (activeExtensionPanelId && !accessibleExtensionPanel) {
      setActiveExtensionPanelId(null);
    }
  }, [activeExtensionPanelId, accessibleExtensionPanel]);

  function openExtensionPanel(id: string) {
    const panel = mirante.panels.find((candidate) => candidate.id === id);
    if (panel && isExtensionAccessAllowed(panel.access, accessContext)) {
      setActiveExtensionPanelId(id);
    }
  }

  return (
    <main className="app-shell" style={themeStyle}>
      <div
        ref={mapTargetRef}
        className="map-viewport"
        role="region"
        aria-label={t("ariaLabel")}
        tabIndex={0}
      />
      <Brand
        applicationName={config.branding.applicationName}
        logoUrl={config.branding.logoUrl}
      />
      <LayersPanel
        datasets={datasets}
        filteredDatasetIds={Object.keys(datasetFilters).map(Number)}
        onOpacityChange={changeOpacity}
        onOpenAttributes={openAttributeTable}
        onReorder={reorderDataset}
        onRemove={removeDataset}
        onVisibilityChange={changeVisibility}
        onZoom={zoomToDataset}
      />
      <DatasetCatalogDrawer
        activeDatasetIds={datasets.map((item) => item.dataset.id)}
        client={datasetClient}
        open={catalogueOpen}
        refreshKey={catalogueRefreshKey}
        onAdd={addDatasetToMap}
        onOpenChange={setCatalogueOpen}
      />
      <LanguageSelector locales={config.i18n.locales} />
      <UserArea
        datasetManagementUrl={datasetManagementUrl}
        providers={mirante.authenticationProviders}
        onProviderSignIn={startProviderSignIn}
      />
      <ActionDock
        actions={mirante.mapToolbar}
        authenticated={status === "authenticated"}
        canUploadDatasets={user?.canUploadDatasets === true}
        capabilities={capabilities}
        fallbackLocale={config.i18n.fallbackLocale}
        map={map}
        onClosePanel={() => setActiveExtensionPanelId(null)}
        onOpenPanel={openExtensionPanel}
        baseMap={baseMap}
        baseMaps={config.map.baseMaps}
        onBaseMapChange={changeBaseMap}
        onMaps={() => setMapLibraryOpen(true)}
        uploadEnabled={config.features.datasetUpload}
        onUpload={() => {
          setUploadState(initialUploadState);
          setUploadOpen(true);
        }}
      />
      {map && accessibleExtensionPanel ? (
        <ExtensionPanelHost
          map={map}
          panel={accessibleExtensionPanel}
          onClose={() => setActiveExtensionPanelId(null)}
        />
      ) : null}
      {mapLibraryOpen ? (
        <MapPersistenceDialog
          activeMap={activeSavedMap}
          canCreate={user?.canCreateMaps === true}
          canEditActive={canEditCurrentMap}
          client={mapClient}
          layerCount={datasets.length}
          onClose={() => setMapLibraryOpen(false)}
          onOpen={openMap}
          onSave={saveMap}
          onUpdate={updateMap}
        />
      ) : null}
      {uploadOpen ? (
        <DatasetUploadDialog
          groups={uploadGroupsState.groups}
          groupsLoading={uploadGroupsState.status === "loading"}
          groupsUnavailable={uploadGroupsState.status === "error"}
          maximumFileSize={config.features.datasetUploadMaximumFileSizeBytes}
          state={uploadState}
          onClose={() => setUploadOpen(false)}
          onUpload={(file, customizations) =>
            void uploadDataset(file, customizations)
          }
          visibilityControlEnabled={visibilityControlEnabled}
        />
      ) : null}
      {featureInfo ? (
        <FeatureInfoDialog
          result={featureInfo}
          onClose={() => setFeatureInfo(null)}
        />
      ) : null}
      {attributeDataset ? (
        <AttributeTable
          key={attributeDataset.id}
          client={datasetClient}
          dataset={attributeDataset}
          filter={datasetFilters[attributeDataset.id]}
          onClose={() => setAttributeDataset(null)}
          onFilterChange={(filter) =>
            changeDatasetFilter(attributeDataset.id, filter)
          }
          onLocate={(feature) => {
            setSelectedFeature({
              datasetId: attributeDataset.id,
              featureId: feature.id,
              ...(feature.geometry ? { geometry: feature.geometry } : {}),
            });
            map?.setSelectedFeatureGeometry(feature.geometry ?? undefined);
            if (feature.extent) map?.fitGeographicExtent(feature.extent);
          }}
          selectedFeatureId={
            selectedFeature?.datasetId === attributeDataset.id
              ? selectedFeature.featureId
              : undefined
          }
        />
      ) : null}
    </main>
  );
}

function AuthenticationBoundary({
  authenticationRequired,
  children,
}: {
  authenticationRequired: boolean;
  children: React.ReactNode;
}) {
  const { status } = useAuthentication();
  const { t } = useTranslation("authentication");
  const { config } = mirante;

  useEffect(() => {
    document.title = config.branding.applicationName;
  }, [config.branding.applicationName]);

  if (!authenticationRequired || status === "authenticated") return children;

  const waiting = status === "restoring" || status === "signing-out";
  return (
    <main
      className="authentication-gate"
      style={createThemeStyle(config.theme)}
    >
      <Brand
        applicationName={config.branding.applicationName}
        logoUrl={config.branding.logoUrl}
      />
      <LanguageSelector locales={config.i18n.locales} />
      {waiting ? (
        <p className="authentication-gate__status" role="status">
          {status === "signing-out" ? t("signingOut") : t("checkSession")}
        </p>
      ) : (
        <section
          className="authentication-dialog authentication-gate__dialog"
          aria-labelledby="authentication-dialog-title"
          aria-describedby="authentication-gate-description"
        >
          <SignInPanel
            descriptionId="authentication-gate-description"
            providers={mirante.authenticationProviders}
            onProviderSignIn={startProviderSignIn}
          />
        </section>
      )}
    </main>
  );
}

export function App({
  authenticationClient = defaultAuthenticationClient,
  authenticationRequired = mirante.config.authentication.required,
  datasetClient = defaultDatasetClient,
  mapClient = defaultMapClient,
}: {
  authenticationClient?: GeoNodeAuthenticationClient;
  authenticationRequired?: boolean;
  datasetClient?: GeoNodeDatasetClient;
  mapClient?: GeoNodeMapClient;
}) {
  return (
    <AuthenticationProvider client={authenticationClient}>
      <AuthenticationBoundary authenticationRequired={authenticationRequired}>
        <ApplicationShell datasetClient={datasetClient} mapClient={mapClient} />
      </AuthenticationBoundary>
    </AuthenticationProvider>
  );
}
