import {
  configureI18n,
  registerTranslationBundle,
  type SupportedLocale,
} from "@mirante/i18n";
import {
  defineExtension,
  type MapToolbarItemDefinition,
  type MiranteExtension,
} from "@mirante/sdk";

export interface MiranteConfig {
  branding: {
    applicationName: string;
    logoUrl: string;
  };
  theme: {
    primaryColor: string;
    primaryColorStrong: string;
  };
  geonode: {
    baseUrl: string;
    datasetManagementPath: string;
  };
  i18n: {
    supportedLocales: readonly SupportedLocale[];
    fallbackLocale: SupportedLocale;
  };
  map: {
    initialCenter: readonly [longitude: number, latitude: number];
    initialZoom: number;
  };
  features: {
    datasetUpload: boolean;
    drawings: boolean;
    measurements: boolean;
  };
}

export interface RegisteredToolbarItem extends MapToolbarItemDefinition {
  extensionId: string;
  translationNamespace: string;
}

export interface MiranteDefinition {
  config: MiranteConfig;
  mapToolbar: readonly RegisteredToolbarItem[];
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
  supportedLocales: readonly SupportedLocale[],
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
  if (config.i18n.supportedLocales.length === 0) {
    throw new Error("At least one supported locale must be configured.");
  }

  if (!config.i18n.supportedLocales.includes(config.i18n.fallbackLocale)) {
    throw new Error(
      "The fallback locale must be included in supported locales.",
    );
  }

  configureI18n(config.i18n);

  const registeredIds = new Set<string>();
  const mapToolbar: RegisteredToolbarItem[] = [];
  const allExtensions = [createNativeMapExtension(config), ...extensions];

  for (const extension of allExtensions) {
    assertValidExtensionId(extension.id);

    if (registeredIds.has(extension.id)) {
      throw new Error(`Extension id "${extension.id}" is already registered.`);
    }

    registeredIds.add(extension.id);
    const translationNamespace = registerExtensionTranslations(
      extension,
      config.i18n.supportedLocales,
    );

    for (const toolbarItem of extension.mapToolbar ?? []) {
      mapToolbar.push({
        ...toolbarItem,
        extensionId: extension.id,
        translationNamespace,
      });
    }
  }

  return {
    config,
    mapToolbar,
  };
}
