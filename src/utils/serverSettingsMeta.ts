/**
 * Central disable-not-hide lock (THB-03): a setting locked by the
 * platform operator via `serverSettingsMeta` renders disabled, never
 * hidden. Shared by TenantColor, LogoAndFavicon and the Theme page.
 */
export type ServerSettingsMeta = Record<string, { readOnly?: boolean }>;

export const isReadOnlySetting = (meta: ServerSettingsMeta | undefined, keys: string[]): boolean =>
    keys.some((key) => meta?.[key]?.readOnly);
