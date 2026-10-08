import { parseBackendInstant } from '../../../../utils/backendInstant';

// One zoneless-UTC rule for the whole app lives in utils/backendInstant.
export { parseBackendInstant as parseUtcTimestamp };

/** Contract-document times are shown in German wall-clock time, whatever the browser zone. */
export const formatBerlinDateTime = (value: string, lang: string): string => {
    const date = parseBackendInstant(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' });
};
