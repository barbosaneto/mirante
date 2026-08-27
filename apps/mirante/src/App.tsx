import {
  createGeoNodeAuthenticationClient,
  createGeoNodeDatasetClient,
  GeoNodeDatasetIngestionError,
  type GeoNodeAuthenticationClient,
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
  const { status } = useAuthentication();
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapFacade | null>(null);
  const [datasets, setDatasets] = useState<DisplayedDataset[]>([]);
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
      const displayedDataset: DisplayedDataset = {
        dataset,
        loadStatus: "loading",
        opacity: 1,
        visible: true,
      };

      setDatasets((currentDatasets) => [
        displayedDataset,
        ...currentDatasets.filter((item) => item.dataset.id !== dataset.id),
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
        onVisibilityChange={changeVisibility}
      />
      <LanguageSelector locales={config.i18n.supportedLocales} />
      <UserArea />
      <ActionDock
        actions={mirante.mapToolbar}
        authenticated={status === "authenticated"}
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
