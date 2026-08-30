import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type ProxyOptions } from "vite";

const geonodeProxyRoutes = [
  "/about",
  "/account",
  "/accounts",
  "/activity",
  "/admin",
  "/announcements",
  "/api",
  "/apps",
  "/avatar",
  "/base",
  "/capabilities",
  "/catalogue",
  "/datasets",
  "/developer",
  "/djmp",
  "/documents",
  "/geoserver",
  "/groups",
  "/gs",
  "/harvesters",
  "/help",
  "/i18n",
  "/invitations",
  "/jsi18n",
  "/maps",
  "/media",
  "/metadata_update_redirect",
  "/notifications",
  "/oauth2",
  "/o",
  "/people",
  "/privacy_cookies",
  "/proxy",
  "/resources",
  "/security",
  "/select2",
  "/services",
  "/showmetadata",
  "/social",
  "/static",
  "/upload",
  "/uploaded",
  "/uploads",
];

function createGeoNodeProxy(target: string): Record<string, ProxyOptions> {
  return Object.fromEntries(
    geonodeProxyRoutes.map((route) => [
      route,
      {
        target,
        changeOrigin: false,
      },
    ]),
  );
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    headers: {
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
    },
    watch: {
      usePolling: process.env.MIRANTE_USE_POLLING === "true",
    },
    proxy: createGeoNodeProxy(
      process.env.GEONODE_INTERNAL_URL ?? "http://localhost:8000",
    ),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: fileURLToPath(new URL("./src/test-setup.ts", import.meta.url)),
  },
});
