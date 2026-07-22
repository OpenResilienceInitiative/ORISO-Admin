import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const meterProviderCtor = vi.fn();
const setGlobalMeterProvider = vi.fn();
const resourceFromAttributes = vi.fn((attributes: Record<string, unknown>) => ({ attributes }));
const otlpMetricExporterCtor = vi.fn();
const periodicMetricReaderCtor = vi.fn();

vi.mock('@opentelemetry/sdk-metrics', () => ({
    MeterProvider: vi.fn().mockImplementation(function MeterProvider(...args: unknown[]) {
        meterProviderCtor(...args);
        return { args };
    }),
    PeriodicExportingMetricReader: vi
        .fn()
        .mockImplementation(function PeriodicExportingMetricReader(...args: unknown[]) {
            periodicMetricReaderCtor(...args);
            return { args };
        }),
}));

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
    OTLPMetricExporter: vi.fn().mockImplementation(function OTLPMetricExporter(...args: unknown[]) {
        otlpMetricExporterCtor(...args);
        return { args };
    }),
}));

vi.mock('@opentelemetry/resources', () => ({
    resourceFromAttributes: (attributes: Record<string, unknown>) => resourceFromAttributes(attributes),
}));

vi.mock('@opentelemetry/api', () => ({
    metrics: { setGlobalMeterProvider },
}));

describe('initWebVitalsMeterProvider', () => {
    beforeEach(() => {
        vi.resetModules();
        meterProviderCtor.mockClear();
        setGlobalMeterProvider.mockClear();
        resourceFromAttributes.mockClear();
        otlpMetricExporterCtor.mockClear();
        periodicMetricReaderCtor.mockClear();
        window.__APP_CONFIG__ = {
            OBSERVABILITY_ENABLED: 'true',
            OTEL_METRICS_URL: 'https://collector.example.test/v1/metrics',
            OTEL_EXPORT_INTERVAL_MS: '60000',
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
        window.__APP_CONFIG__ = undefined;
    });

    it('does not initialize or export when browser telemetry is disabled', async () => {
        window.__APP_CONFIG__ = { OBSERVABILITY_ENABLED: 'false' };
        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');

        initWebVitalsMeterProvider();

        expect(otlpMetricExporterCtor).not.toHaveBeenCalled();
        expect(meterProviderCtor).not.toHaveBeenCalled();
        expect(setGlobalMeterProvider).not.toHaveBeenCalled();
    });

    it('does not initialize when the runtime endpoint is missing', async () => {
        window.__APP_CONFIG__ = { OBSERVABILITY_ENABLED: 'true' };
        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');

        initWebVitalsMeterProvider();

        expect(otlpMetricExporterCtor).not.toHaveBeenCalled();
        expect(meterProviderCtor).not.toHaveBeenCalled();
    });

    it('uses the runtime endpoint and export interval', async () => {
        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');

        initWebVitalsMeterProvider();

        expect(otlpMetricExporterCtor).toHaveBeenCalledWith({
            url: 'https://collector.example.test/v1/metrics',
        });
        expect(periodicMetricReaderCtor).toHaveBeenCalledWith(expect.objectContaining({ exportIntervalMillis: 60000 }));
    });

    it('builds the resource with service.name "admin" (not "frontend")', async () => {
        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');
        initWebVitalsMeterProvider();

        expect(resourceFromAttributes).toHaveBeenCalledWith({ 'service.name': 'admin' });
    });

    it('registers a MeterProvider globally', async () => {
        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');
        initWebVitalsMeterProvider();

        expect(meterProviderCtor).toHaveBeenCalledTimes(1);
        expect(setGlobalMeterProvider).toHaveBeenCalledTimes(1);
    });

    it('is idempotent -- calling it twice only sets up the MeterProvider once', async () => {
        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');
        initWebVitalsMeterProvider();
        initWebVitalsMeterProvider();

        expect(meterProviderCtor).toHaveBeenCalledTimes(1);
        expect(setGlobalMeterProvider).toHaveBeenCalledTimes(1);
    });

    it('never throws even if MeterProvider construction fails', async () => {
        vi.doMock('@opentelemetry/sdk-metrics', () => ({
            MeterProvider: vi.fn().mockImplementation(function MeterProvider() {
                throw new Error('boom');
            }),
            PeriodicExportingMetricReader: vi
                .fn()
                .mockImplementation(function PeriodicExportingMetricReader(...args: unknown[]) {
                    return { args };
                }),
        }));
        vi.resetModules();

        const { initWebVitalsMeterProvider } = await import('./webVitalsMeterProvider');
        expect(() => initWebVitalsMeterProvider()).not.toThrow();
    });
});
