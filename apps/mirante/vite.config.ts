import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type ProxyOptions } from "vite";

const geonodeProxyRoutes = [
  "/api",
  "/account",
  "/accounts",
  "/avatar",
  "/catalogue",
  "/geoserver",
  "/media",
  "/oauth2",
  "/o",
  "/static",
  "/uploaded",
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
