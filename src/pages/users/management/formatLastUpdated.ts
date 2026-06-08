import moment from 'moment';

const parseApiDate = (value?: string | null): moment.Moment | null => {
    if (!value || value === 'null' || value === 'undefined') {
        return null;
    }
    const parsed = moment(value);
    return parsed.isValid() ? parsed : null;
};

/** Prefer updateDate, fall back to createDate from API. */
export const getLastUpdatedMoment = (record: { updateDate?: string; createDate?: string }): moment.Moment | null =>
    parseApiDate(record.updateDate) || parseApiDate(record.createDate);

export const formatLastUpdated = (record: { updateDate?: string; createDate?: string }, useRelative = true): string => {
    const date = getLastUpdatedMoment(record);
    if (!date) {
        return '—';
    }
    return useRelative ? date.fromNow() : date.format('L LT');
};
