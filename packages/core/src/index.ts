import {
  configureI18n,
  registerLocaleResources,
  registerTranslationBundle,
} from "@mirante/i18n";
import {
  defineExtension,
  miranteCapabilities,
  type AuthenticationProviderDefinition,
  type BaseMapDefinition,
  type ExtensionPanelDefinition,
  type ExtensionTranslationBundle,
  type MapToolbarItemDefinition,
  type MiranteExtension,
  type ExtensionAccessRequirement,
} from "@mirante/sdk";

export interface MiranteConfig {
  authentication: {
    required: boolean;
  };
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

export interface RegisteredAuthenticationProvider
  extends AuthenticationProviderDefinition {
  extensionId: string;
  translationNamespace: string;
}

export interface MiranteDefinition {
  authenticationProviders: readonly RegisteredAuthenticationProvider[];
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

function assertValidAccessRequirement(
  owner: string,
  access: ExtensionAccessRequirement | undefined,
): void {
  if (!access) return;
  const supported = new Set<string>(miranteCapabilities);
  for (const capability of [...(access.allOf ?? []), ...(access.anyOf ?? [])]) {
    if (!supported.has(capability)) {
      throw new Error(
        `${owner} requires unsupported capability "${capability}".`,
      );
    }
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
  const registeredAuthenticationProviderIds = new Set<string>();
  const authenticationProviders: RegisteredAuthenticationProvider[] = [];
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

    for (const provider of extension.authenticationProviders ?? []) {
      assertValidExtensionId(provider.id);
      if (registeredAuthenticationProviderIds.has(provider.id)) {
        throw new Error(
          `Authentication provider id "${provider.id}" is already registered.`,
        );
      }
      if (
        !provider.loginPath.startsWith("/") ||
        provider.loginPath.startsWith("//") ||
        provider.loginPath.includes("\\")
      ) {
        throw new Error(
          `Authentication provider "${provider.id}" must use a same-origin absolute path.`,
        );
      }
      registeredAuthenticationProviderIds.add(provider.id);
      authenticationProviders.push({
        ...provider,
        extensionId: extension.id,
        translationNamespace,
      });
    }

    for (const toolbarItem of extension.mapToolbar ?? []) {
      assertValidAccessRequirement(
        `Toolbar item "${toolbarItem.id}"`,
        toolbarItem.access,
      );
      mapToolbar.push({
        ...toolbarItem,
        ...(toolbarItem.requiresAuthentication
          ? {
              access: {
                ...toolbarItem.access,
                authenticated: true,
              },
            }
          : {}),
        extensionId: extension.id,
        translationNamespace,
      });
    }
    for (const panel of extension.panels ?? []) {
      assertValidExtensionId(panel.id);
      assertValidAccessRequirement(`Panel "${panel.id}"`, panel.access);
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
    authenticationProviders,
    config,
    mapToolbar,
    panels,
  };
}
