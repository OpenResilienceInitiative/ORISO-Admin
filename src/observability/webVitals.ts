import { metrics } from '@opentelemetry/api';
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { normalizedPagePath } from './normalizedPagePath';

// OBS-P8 (ORISO-Helm#62): Core Web Vitals capture, exported as OpenTelemetry
// metrics to SigNoz. Meter/histogram names must match exactly -- the imported
// SigNoz dashboard queries these names verbatim, and a typo here would break
// the dashboard silently (no error anywhere).
const meter = metrics.getMeter('web-vitals');
const lcp = meter.createHistogram('lcp');
const cls = meter.createObservableGauge('cls');
const inp = meter.createHistogram('inp');
const ttfb = meter.createHistogram('ttfb');
const fcp = meter.createHistogram('fcp');

/**
 * Deliberately does NOT attach user.id or browser/user-agent identifiers.
 * SigNoz is developer/ops observability tooling only here, never a source of
 * per-user tracking (ADR-011; see ORISO-Helm's OBS-P6 pseudonymization work).
 * `url.path_template` (already ID-scrubbed) is the only attribute attached --
 * this matters even more for Admin than for the consumer-facing Frontend,
 * since Admin users are staff/counsellor-admin accounts.
 */
const sendToAnalytics = (metric: Metric): void => {
    try {
        const attributes = { 'url.path_template': normalizedPagePath() };
        switch (metric.name) {
            case 'LCP':
                lcp.record(metric.value, attributes);
                break;
            case 'CLS':
                cls.addCallback((observableResult) => observableResult.observe(metric.value, attributes));
                break;
            case 'INP':
                inp.record(metric.value, attributes);
                break;
            case 'TTFB':
                ttfb.record(metric.value, attributes);
                break;
            case 'FCP':
                fcp.record(metric.value, attributes);
                break;
            default:
                break;
        }
    } catch {
        // Never let telemetry recording break the app.
    }
};

let initialized = false;

/**
 * Starts Core Web Vitals capture for the current page load. Idempotent and
 * best-effort: must never throw or block rendering. Call once at app startup,
 * after `initWebVitalsMeterProvider`.
 */
export const initWebVitals = (): void => {
    if (initialized) {
        return;
    }

    try {
        onCLS(sendToAnalytics);
        onINP(sendToAnalytics);
        onLCP(sendToAnalytics);
        onTTFB(sendToAnalytics);
        onFCP(sendToAnalytics);
        initialized = true;
    } catch {
        // Never let telemetry setup break app startup.
    }
};
