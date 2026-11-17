/** The add-on contract `oriso-addon/v1` (ADR-034) as ORISO-Admin sees it. */

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

/**
 * What the platform admin allows a Träger: `OFF` not available, `TENANT` the Träger decides,
 * `ON` always on, `ON_HIDDEN` always on and not shown to Träger admins.
 */
export const ADDON_MODES = ['OFF', 'TENANT', 'ON', 'ON_HIDDEN'] as const;
export type AddonMode = (typeof ADDON_MODES)[number];

/**
 * One entry of `GET /service/addons/admin/addons/{name}/tenants` (SuperAdmins): a Träger with a
 * switch or agency overrides for the add-on. `updatedAt` is missing when only overrides exist.
 */
export interface AddonTenantState {
    tenantId: number;
    mode: AddonMode;
    enabled: boolean;
    updatedAt?: string | null;
    updatedBy?: string | null;
    agenciesEnabled: number;
    agenciesDisabled: number;
}

/** The platform-wide switch of an add-on; off until a SuperAdmin switches it on. */
export interface AddonGlobalSwitch {
    enabled: boolean;
    updatedAt?: string | null;
    updatedBy?: string | null;
}

/** One entry of `GET /service/addons/admin/addons`; `enabled` is the effective state for the Träger. */
export interface AdminAddon {
    manifest: AddonManifest;
    source?: string;
    discoveredAt?: string;
    global?: AddonGlobalSwitch;
    tenantId: number;
    mode?: AddonMode;
    tenantCanSwitch?: boolean;
    hasReadme?: boolean;
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

/** One entry of `GET /service/addons/admin/audit`, written by an add-on backend through the host API. */
export interface AddonAuditEntry {
    id: string | number;
    createdAt: string;
    addon: string;
    appId?: string | null;
    action: string;
    summary?: LocalizedText;
    actor?: { id?: string | null; username?: string | null; roles?: string[] | null } | null;
    tenantId?: number | null;
    agencyId?: number | null;
    sessionId?: number | string | null;
    subjectId?: string | null;
}

export interface AddonAuditPage {
    items: AddonAuditEntry[];
    page: number;
    size: number;
    total: number;
}

export interface AddonAuditQuery {
    tenantId?: number | null;
    addon?: string | null;
    from?: string | null;
    to?: string | null;
    page: number;
    size: number;
}

/** What every lifecycle function of an add-on bundle receives. */
/**
 * A short on-screen message for the person using the add-on, shown with the host's own
 * notifications. Plain text only; the add-on translates it.
 */
export interface AddonNotice {
    type: 'success' | 'info' | 'warning' | 'error';
    text: string;
    title?: string;
}

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
    /** Shows a short message through the host's notifications. */
    notify: (notice: AddonNotice) => void;
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
