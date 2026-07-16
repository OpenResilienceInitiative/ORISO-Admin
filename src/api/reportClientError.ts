import { errorReportEndpoint } from '../appConfig';

export type ErrorReportSeverity = 'error' | 'warn';

export interface ClientErrorReport {
    message: string;
    stack?: string;
    url?: string;
    correlationId?: string;
    severity?: ErrorReportSeverity;
}

type ErrorReportBody = {
    source: 'admin';
    message: string;
    stack?: string;
    url: string;
    userAgent?: string;
    correlationId?: string;
    severity: ErrorReportSeverity;
};

const currentUrl = (fallback?: string): string =>
    fallback || (typeof window !== 'undefined' && window.location?.href) || '';

const currentUserAgent = (): string | undefined => (typeof navigator !== 'undefined' ? navigator.userAgent : undefined);

const noop = () => undefined;

/**
 * Best-effort, fire-and-forget report of a client-side crash to UserService's
 * unauthenticated OBS-P3 error-intake endpoint (ORISO-Helm#62), which logs it
 * through its existing structured logger for SigNoz.
 *
 * Must never throw or reject: this is telemetry, called from error-handling
 * paths (e.g. `ErrorBoundary.componentDidCatch`) that must not themselves be
 * able to fail.
 */
export const reportClientError = (report: ClientErrorReport): void => {
    try {
        const body: ErrorReportBody = {
            source: 'admin',
            message: report.message || 'Unknown admin error',
            stack: report.stack,
            url: currentUrl(report.url),
            userAgent: currentUserAgent(),
            correlationId: report.correlationId,
            severity: report.severity ?? 'error',
        };

        fetch(errorReportEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).catch(noop); // Network failure reporting the error -- ignore, best-effort only.
    } catch {
        // Never let error reporting itself throw.
    }
};
