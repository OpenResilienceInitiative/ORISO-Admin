// ORISO services send `LocalDateTime` without a zone, and the wall clock is UTC.
// `new Date()` would read such a value as the browser's local time.
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

const asUtc = (value: string) => (ZONELESS_DATE_TIME.test(value) ? `${value}Z` : value);

export const parseBackendInstant = (value: string): Date => new Date(asUtc(value));

// Timestamp fields by name (createDate, sentAt, timestamp …); free text such as `notes` is never rewritten.
const TIMESTAMP_KEY = /^(at|date|time|timestamp)$|[a-z](Date|At|Time|Timestamp)$/;

const normalise = (value: unknown, isTimestamp: boolean): unknown => {
    if (typeof value === 'string') return isTimestamp ? asUtc(value) : value;
    if (Array.isArray(value)) return value.map((item) => normalise(item, isTimestamp));
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, normalise(item, TIMESTAMP_KEY.test(key))]),
        );
    }
    return value;
};

/** Applied where a response enters the app: zoneless date-times in timestamp fields become UTC. */
export const withUtcInstants = <T>(value: T): T => normalise(value, true) as T;
