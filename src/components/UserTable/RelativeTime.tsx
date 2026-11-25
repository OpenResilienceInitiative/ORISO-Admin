import { useTranslation } from 'react-i18next';

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
];

export const formatRelative = (value: Date, now: Date, locale: string) => {
    const elapsed = value.getTime() - now.getTime();
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const match = UNITS.find(({ ms }) => Math.abs(elapsed) >= ms);
    return match ? formatter.format(Math.trunc(elapsed / match.ms), match.unit) : formatter.format(0, 'minute');
};

export interface RelativeTimeProps {
    /** ISO timestamp. */
    value: string;
    /** Reference point; defaults to the current time (fixed in stories and tests). */
    now?: Date;
}

/** „vor 3 Tagen", exact date and time in the tooltip. */
export const RelativeTime = ({ value, now = new Date() }: RelativeTimeProps) => {
    const { i18n } = useTranslation();
    const locale = i18n?.language || 'de';
    const date = new Date(value);
    const exact = date.toLocaleString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    return (
        <time dateTime={value} title={exact}>
            {formatRelative(date, now, locale)}
        </time>
    );
};
