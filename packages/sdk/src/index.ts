import type { ComponentType } from "react";

export type ToolbarIcon = "globe" | "home";
export type ExtensionToolbarIcon = ComponentType<{ className?: string }>;

export interface MapViewOptions {
  center: readonly [longitude: number, latitude: number];
  zoom: number;
}

export type BaseMapId = string;

export interface BaseMapDefinition {
  id: BaseMapId;
  labels: Readonly<Record<string, string>>;
  tileUrl: string;
  attributions: readonly string[];
}

export interface MapCommandApi {
  setView: (options: MapViewOptions) => void;
}

export interface ToolbarActionContext {
  map: MapCommandApi;
  ui: {
    closePanel: () => void;
    openPanel: (id: string) => void;
  };
}

export interface MapToolbarItemDefinition {
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
  id: string;
  titleKey: string;
  component: ComponentType<ExtensionPanelProps>;
}

export interface MiranteExtension {
  id: string;
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
