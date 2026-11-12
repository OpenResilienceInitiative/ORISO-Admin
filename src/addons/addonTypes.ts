/** The add-on contract `oriso-addon/v1` (ADR-032) as ORISO-Admin sees it. */

export const ADDON_CONTRACT = 'oriso-addon/v1';

export const ADMIN_PAGE_SLOT = 'admin.page';

export type LocalizedText = Record<string, string>;

export interface AddonApp {
    id: string;
    title?: LocalizedText;
    slots: string[];
}

export interface AddonStatDefinition {
    id: string;
    label?: LocalizedText;
    type?: string;
}

export interface AddonManifest {
    name: string;
    version: string;
    contract?: string;
    react?: string;
    apps?: AddonApp[];
    ui?: string;
    settings?: string;
    stats?: AddonStatDefinition[];
    [key: string]: unknown;
}

export interface AgencyOverride {
    tenantId: number;
    agencyId: number;
    enabled: boolean;
    updatedAt?: string;
    updatedBy?: string;
}

/** One entry of `GET /service/addons/admin/addons`. */
export interface AdminAddon {
    manifest: AddonManifest;
    source?: string;
    discoveredAt?: string;
    tenantId: number;
    enabled: boolean;
    agencyOverrides: AgencyOverride[];
}

export interface JsonSchema {
    type?: string | string[];
    title?: string;
    description?: string;
    default?: unknown;
    enum?: unknown[];
    format?: string;
    maxLength?: number;
    minLength?: number;
    minimum?: number;
    maximum?: number;
    pattern?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    [key: string]: unknown;
}

export type AddonSettingsValues = Record<string, unknown>;

export interface AddonSettings {
    schema: JsonSchema | null;
    values: AddonSettingsValues;
}

export interface AddonStatValue {
    id: string;
    label?: LocalizedText;
    type?: string;
    value: number | null;
}

export interface AddonStats {
    stats: AddonStatValue[];
}

/** One entry of `GET /service/addons/registry`, already filtered for the caller. */
export interface AvailableAddon {
    name: string;
    version: string;
    react?: string;
    /** Path of the ES module bundle, relative to the API origin. */
    entry: string;
    /** Path the add-on's API is reachable under, relative to the API origin. */
    apiBase: string;
    apps: AddonApp[];
}

export interface AddonRegistry {
    contract: string;
    addons: AvailableAddon[];
}

/** What every lifecycle function of an add-on bundle receives. */
export interface AddonHostProps {
    contract: typeof ADDON_CONTRACT;
    domElement: HTMLElement;
    addon: { name: string; version: string };
    app: { id: string };
    slot: typeof ADMIN_PAGE_SLOT;
    user: { id: string; username: string; roles: string[] };
    tenant: { id?: number; name?: string };
    locale: string;
    informal: boolean;
    theme: Record<string, string>;
    /** Calls the add-on's own API with the admin's login. */
    api: (path: string, init?: RequestInit) => Promise<Response>;
    navigate: (to: string) => void;
}

/** The module an add-on bundle exports; same shape as a single-spa parcel. */
export interface AddonModule {
    bootstrap?: (props: AddonHostProps) => void | Promise<void>;
    mount: (props: AddonHostProps) => void | Promise<void>;
    unmount: (props: AddonHostProps) => void | Promise<void>;
    update?: (props: AddonHostProps) => void | Promise<void>;
}

export const localizedText = (text: LocalizedText | undefined, language: string, fallback: string): string => {
    if (!text) {
        return fallback;
    }
    const base = language.split(/[-@_]/)[0];
    return text[language] ?? text[base] ?? text.de ?? text.en ?? Object.values(text)[0] ?? fallback;
};
