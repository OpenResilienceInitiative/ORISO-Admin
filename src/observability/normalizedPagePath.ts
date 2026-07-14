/**
 * Normalizes a page path for use as a Web Vitals metric attribute, so that
 * per-record IDs don't explode the SigNoz `url.path_template` cardinality.
 *
 * Based on the sample in the SigNoz Web Vitals docs
 * (https://signoz.io/docs/frontend-monitoring/web-vitals-with-metrics/), extended
 * to also scrub UUID-shaped segments: Admin's routes carry UUIDs for agency,
 * consultant and user IDs, not just numeric IDs.
 *
 * @param pathname defaults to `window.location.pathname`; accepts an explicit
 * value so this stays unit-testable without touching `window.location`.
 */
export const normalizedPagePath = (pathname: string = window.location.pathname): string =>
    pathname
        .replace(/\?.*$/, '')
        .replace(/\/[0-9a-fA-F-]{8,}/g, '/:id')
        .replace(/\/\d+/g, '/:id');
