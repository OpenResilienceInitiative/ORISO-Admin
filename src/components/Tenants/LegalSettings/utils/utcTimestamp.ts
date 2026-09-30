/**
 * TenantService writes proposal and distribution times as UTC `LocalDateTime`, which
 * serialises without a zone ("2026-09-21T12:02:00"). `new Date()` would read that as
 * local time and shift every send time by the browser's offset, so a zoneless value
 * is taken as UTC. Values that carry a zone are left alone.
 */
export const parseUtcTimestamp = (value: string): Date =>
    new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);

/** Contract-document times are shown in German wall-clock time, whatever the browser zone. */
export const formatBerlinDateTime = (value: string, lang: string): string => {
    const date = parseUtcTimestamp(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });
};
