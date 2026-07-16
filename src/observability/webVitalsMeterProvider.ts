import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { metrics } from '@opentelemetry/api';

// OBS-P8 (ORISO-Helm#62): browser-side Real User Monitoring (Core Web Vitals),
// exported to our self-hosted SigNoz collector. `service.name` is 'admin' (not
// 'frontend' -- that's ORISO-Frontend's sibling instrumentation) so the SigNoz
// dashboard's service-name filter can tell the two apps apart.
const resource = resourceFromAttributes({ 'service.name': 'admin' });

const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
        url: 'https://signoz.oriso-dev.site/v1/metrics',
    }),
    exportIntervalMillis: 10000,
});

let initialized = false;

/**
 * Sets up the OpenTelemetry MeterProvider and registers it globally, once.
 *
 * Telemetry is best-effort: this must never throw or block rendering if the
 * MeterProvider can't be constructed (e.g. an unexpected browser environment).
 * Mirrors the fire-and-forget principle already established for client error
 * reporting in `src/api/reportClientError.ts` (OBS-P3).
 */
export const initWebVitalsMeterProvider = (): void => {
    if (initialized) {
        return;
    }

    try {
        const meterProvider = new MeterProvider({ resource, readers: [metricReader] });
        metrics.setGlobalMeterProvider(meterProvider);
        initialized = true;
    } catch {
        // Never let telemetry setup break app startup.
    }
};
