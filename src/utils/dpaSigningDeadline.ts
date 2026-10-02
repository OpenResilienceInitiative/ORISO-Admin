import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DPA_SIGNING_TIME_ZONE = 'Europe/Berlin';

export const isFutureSigningDeadline = (value: string, now = Date.now()): boolean => {
    const parts = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
    if (!parts) return false;
    const calendarInstant = Date.parse(`${parts[1]}Z`);
    // Date.parse silently normalizes dates such as February 30.
    if (!Number.isFinite(calendarInstant) || new Date(calendarInstant).toISOString().slice(0, 19) !== parts[1])
        return false;
    if (parts[2] && (Number(parts[2]) > 23 || Number(parts[3]) > 59)) return false;
    return Number.isFinite(Date.parse(value)) && Date.parse(value) > now;
};

/** Convert the explicitly labelled Berlin wall clock, independently of the browser zone. */
export const berlinSigningDeadline = (value: string, now = Date.now()): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
    try {
        let deadline = dayjs.tz(value, DPA_SIGNING_TIME_ZONE);
        // Native inputs and timezone parsers may normalize impossible dates or the spring DST gap.
        if (deadline.format('YYYY-MM-DDTHH:mm') !== value) return null;
        // Autumn repeats one hour. Always use its first occurrence, rather than
        // dayjs's choice based on the offset on the day the publication is made.
        const earlier = deadline.subtract(1, 'hour').tz(DPA_SIGNING_TIME_ZONE);
        if (earlier.format('YYYY-MM-DDTHH:mm') === value) deadline = earlier;
        if (deadline.valueOf() <= now) return null;
        return deadline.format('YYYY-MM-DDTHH:mm:ssZ');
    } catch {
        return null;
    }
};
