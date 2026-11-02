import type { TFunction } from 'i18next';
import type { StatisticsSettingChange, StatisticsSettingKey } from '../../../types/StatisticsSettings';

/** The settings for how often an admin role gets a new statistics stand (UserService#1547). */
export const isStandSetting = (key: StatisticsSettingKey) =>
    key === 'agencySnapshotInterval' || key === 'tenantSnapshotInterval' || key === 'platformSnapshotInterval';

/** Label of a stored value: thresholds are plain numbers, switches are translated, windows carry their unit. */
export const statisticsSettingValueLabel = (key: StatisticsSettingKey, value: string, t: TFunction): string => {
    if (key === 'messageCountTracking' || isStandSetting(key)) return t(`globalSettings.statistics.value.${value}`);
    if (key === 'requestChartWeeks') return t('globalSettings.statistics.value.weeks', { count: Number(value) });
    if (key === 'topicMonths') return t('globalSettings.statistics.value.months', { count: Number(value) });
    return value;
};

// RFC 4180 quoting for ; " and line breaks; a leading = + - @ (or tab/CR) is prefixed with ' so a
// spreadsheet shows the text instead of running it as a formula (admin login names are free text).
const csvCell = (value: string) => {
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** The change protocol as semicolon CSV with a BOM, so German Excel opens it as a table. */
export const buildStatisticsSettingsProtocolCsv = (entries: StatisticsSettingChange[], t: TFunction): string => {
    const header = ['setting', 'oldValue', 'newValue', 'changedBy', 'effectiveFrom'].map((column) =>
        t(`globalSettings.statistics.protocol.column.${column}`),
    );
    const rows = entries.map((entry) => [
        t(`globalSettings.statistics.setting.${entry.key}`),
        entry.oldValue === null ? '' : statisticsSettingValueLabel(entry.key, entry.oldValue, t),
        statisticsSettingValueLabel(entry.key, entry.newValue, t),
        entry.changedByName ?? t('globalSettings.statistics.protocol.system'),
        entry.effectiveFrom,
    ]);
    return `\ufeff${[header, ...rows].map((cells) => cells.map(csvCell).join(';')).join('\r\n')}\r\n`;
};

export const downloadStatisticsSettingsProtocol = (entries: StatisticsSettingChange[], t: TFunction) => {
    const blob = new Blob([buildStatisticsSettingsProtocolCsv(entries, t)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = t('globalSettings.statistics.protocol.fileName');
    link.click();
    URL.revokeObjectURL(url);
};
