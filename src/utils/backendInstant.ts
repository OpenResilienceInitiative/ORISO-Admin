// ORISO services send `LocalDateTime` without a zone, and the wall clock is UTC.
// `new Date()` would read such a value as the browser's local time.
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

const asUtc = (value: string) => (ZONELESS_DATE_TIME.test(value) ? `${value}Z` : value);

export const parseBackendInstant = (value: string): Date => new Date(asUtc(value));

/** Applied where a response enters the app: every zoneless date-time string becomes UTC. */
export const withUtcInstants = <T>(value: T): T => {
    if (typeof value === 'string') return asUtc(value) as T;
    if (Array.isArray(value)) return value.map(withUtcInstants) as T;
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, withUtcInstants(item)])) as T;
    }
    return value;
};
