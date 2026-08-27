/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEONODE_BASE_URL?: string;
  readonly VITE_GEONODE_WEB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
