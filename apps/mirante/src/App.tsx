import {
  createGeoNodeAuthenticationClient,
  createGeoNodeDatasetClient,
  createGeoNodeMapClient,
  GeoNodeDatasetIngestionError,
  type GeoNodeAuthenticationClient,
  type GeoNodeDataset,
  type GeoNodeDatasetClient,
  type GeoNodeMapClient,
  type UploadDatasetOptions,
} from "@mirante/geonode";
import { createMap, type FeatureInfoEvent, type MapFacade } from "@mirante/map";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "./auth/AuthenticationContext";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { FeatureInfoDialog } from "./features/FeatureInfoDialog";
import { mirante } from "./mirante";
import { MapPersistenceDialog } from "./maps/MapPersistenceDialog";
import { ActionDock } from "./shell/ActionDock";
import { Brand } from "./shell/Brand";
import { DatasetCatalogDrawer } from "./shell/DatasetCatalogDrawer";
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

function ApplicationShell({
  datasetClient,
  mapClient,
}: {
  datasetClient: GeoNodeDatasetClient;
  mapClient: GeoNodeMapClient;
}) {
  const { t } = useTranslation("map");
  const { status, user } = useAuthentication();
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const activeDatasetIdsRef = useRef(new Set<number>());
  const [map, setMap] = useState<MapFacade | null>(null);
  const [datasets, setDatasets] = useState<DisplayedDataset[]>([]);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueRefreshKey, setCatalogueRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mapLibraryOpen, setMapLibraryOpen] = useState(false);
  const [featureInfo, setFeatureInfo] = useState<FeatureInfoEvent | null>(null);
  const [uploadState, setUploadState] =
    useState<UploadWorkflowState>(initialUploadState);
  const { config } = mirante;

  const themeStyle: CSSProperties & Record<`--mirante-${string}`, string> = {
    "--mirante-color-primary": config.theme.primaryColor,
    "--mirante-color-primary-strong": config.theme.primaryColorStrong,
  };

  useEffect(() => {
    const target = mapTargetRef.current;

    if (!target) {
      return;
    }

    const mapFacade = createMap({
      target,
      initialCenter: config.map.initialCenter,
      initialZoom: config.map.initialZoom,
    });
    const unsubscribeFeatureInfo =
      mapFacade.subscribeFeatureInfo(setFeatureInfo);

    setMap(mapFacade);

    return () => {
      unsubscribeFeatureInfo();
      mapFacade.destroy();
    };
  }, [config.map.initialCenter, config.map.initialZoom]);

  useEffect(() => {
    document.title = config.branding.applicationName;
  }, [config.branding.applicationName]);

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
    setDatasets((currentDatasets) => [
      {
        dataset,
        loadStatus: "loading",
        opacity,
        visible,
      },
      ...currentDatasets,
    ]);
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
    map.setDatasetLayerOpacity(dataset.id, opacity);
    map.setDatasetLayerVisibility(dataset.id, visible);
  }

  async function saveMap(title: string) {
    if (!map) return;
    await mapClient.createMap({
      title,
      view: map.getView(),
      layers: datasets.map((item, order) => ({
        datasetId: item.dataset.id,
        layerName: item.dataset.layerName,
        title: item.dataset.title,
        opacity: item.opacity,
        visible: item.visible,
        order,
      })),
    });
  }

  async function openMap(id: number) {
    if (!map) return;
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
    for (const { dataset, layer } of [...restoredDatasets].reverse()) {
      addDatasetToMap(dataset, {
        fit: false,
        opacity: layer.opacity,
        visible: layer.visible,
      });
    }
    map.setView(savedMap.view);
  }

  async function uploadDataset(
    file: File,
    customizations: Pick<UploadDatasetOptions, "metadata" | "style">,
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
        errorDetail: error instanceof Error ? error.message : undefined,
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
    setDatasets((currentDatasets) =>
      currentDatasets.filter((item) => item.dataset.id !== id),
    );
  }

  function zoomToDataset(id: number) {
    map?.fitDatasetLayer(id);
  }

  const managementPath = config.geonode.datasetManagementPath.startsWith("/")
    ? config.geonode.datasetManagementPath
    : `/${config.geonode.datasetManagementPath}`;
  const datasetManagementUrl =
    config.geonode.webUrl === "/" || config.geonode.webUrl === ""
      ? managementPath
      : `${config.geonode.webUrl.replace(/\/$/, "")}${managementPath}`;

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
        onOpacityChange={changeOpacity}
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
      <LanguageSelector locales={config.i18n.supportedLocales} />
      <UserArea datasetManagementUrl={datasetManagementUrl} />
      <ActionDock
        actions={mirante.mapToolbar}
        authenticated={status === "authenticated"}
        canUploadDatasets={user?.canUploadDatasets === true}
        map={map}
        onMaps={() => setMapLibraryOpen(true)}
        uploadEnabled={config.features.datasetUpload}
        onUpload={() => {
          setUploadState(initialUploadState);
          setUploadOpen(true);
        }}
      />
      {mapLibraryOpen ? (
        <MapPersistenceDialog
          canSave={user?.canSaveMaps === true}
          client={mapClient}
          layerCount={datasets.length}
          onClose={() => setMapLibraryOpen(false)}
          onOpen={openMap}
          onSave={saveMap}
        />
      ) : null}
      {uploadOpen ? (
        <DatasetUploadDialog
          state={uploadState}
          onClose={() => setUploadOpen(false)}
          onUpload={(file, customizations) =>
            void uploadDataset(file, customizations)
          }
        />
      ) : null}
      {featureInfo ? (
        <FeatureInfoDialog
          result={featureInfo}
          onClose={() => setFeatureInfo(null)}
        />
      ) : null}
    </main>
  );
}

export function App({
  authenticationClient = defaultAuthenticationClient,
  datasetClient = defaultDatasetClient,
  mapClient = defaultMapClient,
}: {
  authenticationClient?: GeoNodeAuthenticationClient;
  datasetClient?: GeoNodeDatasetClient;
  mapClient?: GeoNodeMapClient;
}) {
  return (
    <AuthenticationProvider client={authenticationClient}>
      <ApplicationShell datasetClient={datasetClient} mapClient={mapClient} />
    </AuthenticationProvider>
  );
}
