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
  type GeoNodeMapClient,
  type UploadDatasetOptions,
} from "@mirante/geonode";
import {
  createMap,
  type DatasetFeatureInfo,
  type FeatureInfoEvent,
  type MapFacade,
} from "@mirante/map";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "./auth/AuthenticationContext";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { AttributeTable } from "./features/AttributeTable";
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

type SelectedFeature = Pick<
  DatasetFeatureInfo,
  "datasetId" | "featureId" | "geometry"
>;

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
  const [datasetFilters, setDatasetFilters] = useState<
    Record<number, GeoNodeAttributeFilter>
  >({});
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueRefreshKey, setCatalogueRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mapLibraryOpen, setMapLibraryOpen] = useState(false);
  const [attributeDataset, setAttributeDataset] =
    useState<GeoNodeDataset | null>(null);
  const [featureInfo, setFeatureInfo] = useState<FeatureInfoEvent | null>(null);
  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
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
        ...(datasetFilters[item.dataset.id]
          ? { filter: datasetFilters[item.dataset.id] }
          : {}),
      })),
    });
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
    setDatasets((currentDatasets) =>
      currentDatasets.filter((item) => item.dataset.id !== id),
    );
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
