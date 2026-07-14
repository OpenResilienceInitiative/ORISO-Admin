import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const meterProviderCtor = vi.fn();
const setGlobalMeterProvider = vi.fn();
const resourceFromAttributes = vi.fn((attributes: Record<string, unknown>) => ({ attributes }));

vi.mock('@opentelemetry/sdk-metrics', () => ({
    MeterProvider: vi.fn().mockImplementation(function MeterProvider(...args: unknown[]) {
        meterProviderCtor(...args);
        return { args };
    }),
    PeriodicExportingMetricReader: vi
        .fn()
        .mockImplementation(function PeriodicExportingMetricReader(...args: unknown[]) {
            return { args };
        }),
}));

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
    OTLPMetricExporter: vi.fn().mockImplementation(function OTLPMetricExporter(...args: unknown[]) {
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
    });

    afterEach(() => {
        vi.clearAllMocks();
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
