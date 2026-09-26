import { parseUtcTimestamp } from './utcTimestamp';

/** Legal send/publish times are read in the platform's legal time zone, not the browser's. */
export const formatLegalDateTime = (value: string | undefined, locale: string): string => {
    if (!value) return '';
    const date = parseUtcTimestamp(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(locale, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Berlin',
          }).format(date);
};
