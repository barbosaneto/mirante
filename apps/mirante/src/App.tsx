import {
  createGeoNodeAuthenticationClient,
  createGeoNodeDatasetClient,
  GeoNodeDatasetIngestionError,
  type GeoNodeAuthenticationClient,
  type GeoNodeDataset,
  type GeoNodeDatasetClient,
} from "@mirante/geonode";
import { createMap, type MapFacade } from "@mirante/map";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuthentication } from "./auth/AuthenticationContext";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { mirante } from "./mirante";
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

const initialUploadState: UploadWorkflowState = {
  status: "idle",
  progress: 0,
};

function ApplicationShell({
  datasetClient,
}: {
  datasetClient: GeoNodeDatasetClient;
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

    setMap(mapFacade);

    return () => {
      mapFacade.destroy();
    };
  }, [config.map.initialCenter, config.map.initialZoom]);

  useEffect(() => {
    document.title = config.branding.applicationName;
  }, [config.branding.applicationName]);

  function addDatasetToMap(dataset: GeoNodeDataset) {
    if (!map || activeDatasetIdsRef.current.has(dataset.id)) {
      return;
    }

    activeDatasetIdsRef.current.add(dataset.id);
    setDatasets((currentDatasets) => [
      {
        dataset,
        loadStatus: "loading",
        opacity: 1,
        visible: true,
      },
      ...currentDatasets,
    ]);
    map.addDatasetLayer({
      ...dataset,
      onLoadStatusChange(loadStatus) {
        setDatasets((currentDatasets) =>
          currentDatasets.map((item) =>
            item.dataset.id === dataset.id ? { ...item, loadStatus } : item,
          ),
        );
      },
    });
  }

  async function uploadDataset(file: File) {
    if (!map) {
      return;
    }

    setUploadState({ status: "uploading", progress: 0, stage: "uploading" });

    try {
      const dataset = await datasetClient.uploadDataset(file, {
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

  const managementPath = config.geonode.datasetManagementPath.startsWith("/")
    ? config.geonode.datasetManagementPath
    : `/${config.geonode.datasetManagementPath}`;
  const datasetManagementUrl =
    config.geonode.baseUrl === "/" || config.geonode.baseUrl === ""
      ? managementPath
      : `${config.geonode.baseUrl.replace(/\/$/, "")}${managementPath}`;

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
        uploadEnabled={config.features.datasetUpload}
        onUpload={() => {
          setUploadState(initialUploadState);
          setUploadOpen(true);
        }}
      />
      {uploadOpen ? (
        <DatasetUploadDialog
          state={uploadState}
          onClose={() => setUploadOpen(false)}
          onUpload={(file) => void uploadDataset(file)}
        />
      ) : null}
    </main>
  );
}

export function App({
  authenticationClient = defaultAuthenticationClient,
  datasetClient = defaultDatasetClient,
}: {
  authenticationClient?: GeoNodeAuthenticationClient;
  datasetClient?: GeoNodeDatasetClient;
}) {
  return (
    <AuthenticationProvider client={authenticationClient}>
      <ApplicationShell datasetClient={datasetClient} />
    </AuthenticationProvider>
  );
}
