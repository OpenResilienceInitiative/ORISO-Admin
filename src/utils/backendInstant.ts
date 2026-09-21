/**
 * ORISO backend services serialise `LocalDateTime` WITHOUT a zone, and the
 * wall clock they store is UTC (pods run in UTC; MariaDB `create_date` equals
 * `utc_timestamp()` — measured on Pre-Dev for #1026). `new Date(value)` reads
 * a zoneless date-time as the BROWSER's local time, which in Germany shifts
 * every such timestamp one or two hours into the past ("vor 2 Stunden" for an
 * invite created seconds ago).
 *
 * This reads a zoneless date-time as UTC and leaves anything that already
 * carries `Z` or an offset — and date-only values, which ECMAScript already
 * treats as UTC — untouched.
 */
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const parseBackendInstant = (value: string): Date =>
    new Date(ZONELESS_DATE_TIME.test(value) ? `${value}Z` : value);

/** Milliseconds since the epoch of a backend timestamp (see {@link parseBackendInstant}). */
export const backendInstantMs = (value: string): number => parseBackendInstant(value).getTime();
