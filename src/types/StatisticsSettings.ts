export const STATISTICS_SETTING_KEYS = [
    'agencyMinimumCounsellors',
    'tenantMinimumCounsellors',
    'platformMinimumCounsellors',
    'messageCountTracking',
    'requestChartWeeks',
    'topicMonths',
    'agencySnapshotInterval',
    'tenantSnapshotInterval',
    'platformSnapshotInterval',
] as const;
export type StatisticsSettingKey = (typeof STATISTICS_SETTING_KEYS)[number];

/** One global statistics setting as the UserService reports it (OBP #93). */
export interface StatisticsSettingState {
    key: StatisticsSettingKey;
    value: string;
    defaultValue: string;
    options: string[];
    /** Since when the current value applies; null when it was never recorded. */
    effectiveFrom: string | null;
    changedBy: string | null;
}

export interface StatisticsSettings {
    settings: StatisticsSettingState[];
    /** Number of protocol lines; sent back on save to detect a concurrent change. */
    revision: number;
}

export interface StatisticsSettingsUpdate {
    values: Partial<Record<StatisticsSettingKey, string>>;
    revision: number;
}

/** One line of the change protocol. */
export interface StatisticsSettingChange {
    key: StatisticsSettingKey;
    oldValue: string | null;
    newValue: string;
    changedById: string | null;
    /** Null when the system recorded the value (introduction default). */
    changedByName: string | null;
    effectiveFrom: string;
}
