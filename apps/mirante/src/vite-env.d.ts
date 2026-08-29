/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEONODE_BASE_URL?: string;
  readonly VITE_GEONODE_WEB_URL?: string;
  readonly VITE_REQUIRE_AUTHENTICATION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_GEONODE_BASE_URL?: string;
  readonly VITE_GEONODE_WEB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
