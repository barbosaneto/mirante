import type { ComponentType } from "react";

export type ToolbarIcon = "globe" | "home";
export type ExtensionToolbarIcon = ComponentType<{ className?: string }>;

export interface MapViewOptions {
  center: readonly [longitude: number, latitude: number];
  zoom: number;
}

export type BaseMapId = string;

interface BaseMapDefinitionBase {
  id: BaseMapId;
  labels: Readonly<Record<string, string>>;
}

export interface RasterBaseMapDefinition extends BaseMapDefinitionBase {
  type?: "raster";
  tileUrl: string;
  attributions: readonly string[];
}

export interface MapLibreStyleBaseMapDefinition extends BaseMapDefinitionBase {
  type: "maplibre-style";
  styleUrl: string;
  attributions: readonly string[];
}

export type BaseMapDefinition =
  | MapLibreStyleBaseMapDefinition
  | RasterBaseMapDefinition;

export interface MapCommandApi {
  setView: (options: MapViewOptions) => void;
}

export const miranteCapabilities = [
  "createMaps",
  "uploadDatasets",
  "manageGeoNode",
  "editCurrentMap",
  "manageCurrentMap",
] as const;

export type MiranteCapability = (typeof miranteCapabilities)[number];
export type MiranteCapabilitySet = Readonly<Record<MiranteCapability, boolean>>;

export interface ExtensionAccessRequirement {
  authenticated?: boolean;
  allOf?: readonly MiranteCapability[];
  anyOf?: readonly MiranteCapability[];
}

export interface ExtensionAccessContext {
  authenticated: boolean;
  capabilities: MiranteCapabilitySet;
}

export function isExtensionAccessAllowed(
  requirement: ExtensionAccessRequirement | undefined,
  context: ExtensionAccessContext,
): boolean {
  if (!requirement) return true;
  if (requirement.authenticated && !context.authenticated) return false;
  if (
    requirement.allOf?.some((capability) => !context.capabilities[capability])
  ) {
    return false;
  }
  if (
    requirement.anyOf &&
    requirement.anyOf.length > 0 &&
    !requirement.anyOf.some((capability) => context.capabilities[capability])
  ) {
    return false;
  }
  return true;
}

export interface ToolbarActionContext {
  map: MapCommandApi;
  ui: {
    closePanel: () => void;
    openPanel: (id: string) => void;
  };
}

export interface MapToolbarItemDefinition {
  access?: ExtensionAccessRequirement;
  id: string;
  labelKey: string;
  icon: ExtensionToolbarIcon | ToolbarIcon;
  requiresAuthentication?: boolean;
  onClick(context: ToolbarActionContext): void;
}

export interface ExtensionTranslationBundle {
  readonly [key: string]: string | ExtensionTranslationBundle;
}

export interface ExtensionPanelProps {
  close: () => void;
  map: MapCommandApi;
}

export interface ExtensionPanelDefinition {
  access?: ExtensionAccessRequirement;
  id: string;
  titleKey: string;
  component: ComponentType<ExtensionPanelProps>;
}

export interface AuthenticationProviderDefinition {
  id: string;
  labelKey: string;
  loginPath: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface MiranteExtension {
  id: string;
  authenticationProviders?: readonly AuthenticationProviderDefinition[];
  mapToolbar?: readonly MapToolbarItemDefinition[];
  panels?: readonly ExtensionPanelDefinition[];
  translations?: Readonly<
    Record<string, ExtensionTranslationBundle | undefined>
  >;
}

export function defineExtension<const TExtension extends MiranteExtension>(
  extension: TExtension,
): TExtension {
  return extension;
}
