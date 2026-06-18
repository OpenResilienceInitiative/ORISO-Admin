export type ServerSettingsMeta = Record<string, { readOnly?: boolean }>;

export const isReadOnlySetting = (meta: ServerSettingsMeta | undefined, keys: string[]): boolean =>
    keys.some((key) => meta?.[key]?.readOnly);
