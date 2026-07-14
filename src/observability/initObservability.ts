import { initWebVitalsMeterProvider } from './webVitalsMeterProvider';

/**
 * OBS-P8 (ORISO-Helm#62) entry point: registers the OpenTelemetry
 * MeterProvider and then starts Core Web Vitals capture, exported to SigNoz.
 *
 * The Web Vitals capture module creates its histograms/gauge at import time,
 * so it's dynamically imported here -- after the MeterProvider is registered
 * globally -- rather than statically imported alongside this module.
 *
 * Call once at app startup, as early as possible. Best-effort: must never
 * throw or block rendering, mirroring the fire-and-forget principle already
 * established for client error reporting (`src/api/reportClientError.ts`,
 * OBS-P3).
 */
export const initObservability = (): void => {
    try {
        initWebVitalsMeterProvider();
        import('./webVitals')
            .then(({ initWebVitals }) => initWebVitals())
            .catch(() => {
                // Never let telemetry setup break app startup.
            });
    } catch {
        // Never let telemetry setup break app startup.
    }
};
