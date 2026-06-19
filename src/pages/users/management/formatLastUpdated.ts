import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);

const parseApiDate = (value?: string | null): dayjs.Dayjs | null => {
    if (!value || value === 'null' || value === 'undefined') {
        return null;
    }
    // API timestamps are UTC LocalDateTime strings without offset (e.g. 2026-06-10T07:54:06)
    const parsed = dayjs.utc(value).local();
    return parsed.isValid() ? parsed : null;
};

/** Prefer updateDate, fall back to createDate from API. */
export const getLastUpdatedAt = (record: { updateDate?: string; createDate?: string }): dayjs.Dayjs | null =>
    parseApiDate(record.updateDate) || parseApiDate(record.createDate);

export const formatLastUpdated = (record: { updateDate?: string; createDate?: string }, useRelative = true): string => {
    const date = getLastUpdatedAt(record);
    if (!date) {
        return '—';
    }
    return useRelative ? date.fromNow() : date.format('L LT');
};
