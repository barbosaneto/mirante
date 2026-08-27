export type ToolbarIcon = "globe" | "home";

export interface MapViewOptions {
  center: readonly [longitude: number, latitude: number];
  zoom: number;
}

export interface MapCommandApi {
  setView(options: MapViewOptions): void;
}

export interface ToolbarActionContext {
  map: MapCommandApi;
}

export interface MapToolbarItemDefinition {
  id: string;
  labelKey: string;
  icon: ToolbarIcon;
  requiresAuthentication?: boolean;
  onClick(context: ToolbarActionContext): void;
}

export interface ExtensionTranslationBundle {
  readonly [key: string]: string | ExtensionTranslationBundle;
}

export interface MiranteExtension {
  id: string;
  mapToolbar?: readonly MapToolbarItemDefinition[];
  translations?: Readonly<
    Partial<Record<"en" | "pt-BR", ExtensionTranslationBundle>>
  >;
}

export function defineExtension<const TExtension extends MiranteExtension>(
  extension: TExtension,
): TExtension {
  return extension;
}
