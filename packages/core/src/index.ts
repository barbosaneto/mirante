import {
  configureI18n,
  registerLocaleResources,
  registerTranslationBundle,
} from "@mirante/i18n";
import {
  defineExtension,
  type BaseMapDefinition,
  type ExtensionPanelDefinition,
  type ExtensionTranslationBundle,
  type MapToolbarItemDefinition,
  type MiranteExtension,
} from "@mirante/sdk";

export interface MiranteConfig {
  branding: {
    applicationName: string;
    logoUrl: string;
  };
  theme: {
    borderColor: string;
    errorColor: string;
    focusColor: string;
    panelColor: string;
    panelStrongColor: string;
    primaryColor: string;
    primaryColorStrong: string;
    primaryContrastColor: string;
    selectionColor: string;
    selectionContrastColor: string;
    selectionFillColor: string;
    successColor: string;
    surfaceColor: string;
    textColor: string;
    textMutedColor: string;
  };
  geonode: {
    baseUrl: string;
    webUrl: string;
    datasetManagementPath: string;
  };
  i18n: {
    locales: readonly {
      id: string;
      label: string;
      resources?: Readonly<Record<string, ExtensionTranslationBundle>>;
    }[];
    fallbackLocale: string;
  };
  map: {
    baseMaps: readonly BaseMapDefinition[];
    defaultBaseMapId: string;
    initialCenter: readonly [longitude: number, latitude: number];
    initialZoom: number;
  };
  features: {
    datasetUpload: boolean;
  };
}

export interface RegisteredToolbarItem extends MapToolbarItemDefinition {
  extensionId: string;
  translationNamespace: string;
}

export interface RegisteredPanel extends ExtensionPanelDefinition {
  extensionId: string;
  translationNamespace: string;
}

export interface MiranteDefinition {
  config: MiranteConfig;
  mapToolbar: readonly RegisteredToolbarItem[];
  panels: readonly RegisteredPanel[];
}

export function defineMiranteConfig<const TConfig extends MiranteConfig>(
  config: TConfig,
): TConfig {
  return config;
}

function assertValidExtensionId(extensionId: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(extensionId)) {
    throw new Error(
      `Extension id "${extensionId}" must use lowercase letters, numbers, and hyphens.`,
    );
  }
}

function createNativeMapExtension(config: MiranteConfig): MiranteExtension {
  return defineExtension({
    id: "mirante-navigation",
    mapToolbar: [
      {
        id: "reset-view",
        labelKey: "resetView.label",
        icon: "home",
        onClick({ map }) {
          map.setView({
            center: config.map.initialCenter,
            zoom: config.map.initialZoom,
          });
        },
      },
    ],
    translations: {
      en: {
        resetView: {
          label: "Reset map view",
        },
      },
      "pt-BR": {
        resetView: {
          label: "Restaurar visualização do mapa",
        },
      },
    },
  });
}

function registerExtensionTranslations(
  extension: MiranteExtension,
  supportedLocales: readonly string[],
): string {
  const namespace = `extension-${extension.id}`;

  for (const locale of supportedLocales) {
    const translations = extension.translations?.[locale];

    if (translations) {
      registerTranslationBundle(locale, namespace, translations);
    }
  }

  return namespace;
}

export function createMirante({
  config,
  extensions = [],
}: {
  config: MiranteConfig;
  extensions?: readonly MiranteExtension[];
}): MiranteDefinition {
  if (config.i18n.locales.length === 0) {
    throw new Error("At least one supported locale must be configured.");
  }

  const localeIds = config.i18n.locales.map((locale) => locale.id);
  if (
    localeIds.some((id) => !id.trim()) ||
    new Set(localeIds).size !== localeIds.length
  ) {
    throw new Error("Locale identifiers must be non-empty and unique.");
  }
  if (!localeIds.includes(config.i18n.fallbackLocale)) {
    throw new Error(
      "The fallback locale must be included in supported locales.",
    );
  }

  for (const locale of config.i18n.locales) {
    if (locale.resources) registerLocaleResources(locale.id, locale.resources);
  }
  configureI18n({
    fallbackLocale: config.i18n.fallbackLocale,
    supportedLocales: localeIds,
  });

  if (config.map.baseMaps.length === 0) {
    throw new Error("At least one base map must be configured.");
  }
  const baseMapIds = config.map.baseMaps.map((baseMap) => baseMap.id);
  if (
    baseMapIds.some((id) => !id.trim()) ||
    new Set(baseMapIds).size !== baseMapIds.length
  ) {
    throw new Error("Base map identifiers must be non-empty and unique.");
  }
  if (
    config.map.baseMaps.some(
      (baseMap) => !baseMap.labels[config.i18n.fallbackLocale]?.trim(),
    )
  ) {
    throw new Error("Every base map must have a fallback locale label.");
  }
  if (
    !config.map.baseMaps.some(
      (baseMap) => baseMap.id === config.map.defaultBaseMapId,
    )
  ) {
    throw new Error("The default base map must be registered.");
  }

  const registeredIds = new Set<string>();
  const registeredPanelIds = new Set<string>();
  const mapToolbar: RegisteredToolbarItem[] = [];
  const panels: RegisteredPanel[] = [];
  const allExtensions = [createNativeMapExtension(config), ...extensions];

  for (const extension of allExtensions) {
    assertValidExtensionId(extension.id);

    if (registeredIds.has(extension.id)) {
      throw new Error(`Extension id "${extension.id}" is already registered.`);
    }

    registeredIds.add(extension.id);
    const translationNamespace = registerExtensionTranslations(
      extension,
      localeIds,
    );

    for (const toolbarItem of extension.mapToolbar ?? []) {
      mapToolbar.push({
        ...toolbarItem,
        extensionId: extension.id,
        translationNamespace,
      });
    }
    for (const panel of extension.panels ?? []) {
      assertValidExtensionId(panel.id);
      if (registeredPanelIds.has(panel.id)) {
        throw new Error(`Panel id "${panel.id}" is already registered.`);
      }
      registeredPanelIds.add(panel.id);
      panels.push({
        ...panel,
        extensionId: extension.id,
        translationNamespace,
      });
    }
  }

  return {
    config,
    mapToolbar,
    panels,
  };
}
