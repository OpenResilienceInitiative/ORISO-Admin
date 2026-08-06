import { beforeEach, describe, expect, it, vi } from 'vitest';

const initWebVitalsMeterProvider = vi.fn();
const initWebVitals = vi.fn();
const callOrder: string[] = [];

vi.mock('./webVitalsMeterProvider', () => ({
    initWebVitalsMeterProvider: () => {
        callOrder.push('meterProvider');
        initWebVitalsMeterProvider();
    },
}));

vi.mock('./webVitals', () => ({
    initWebVitals: () => {
        callOrder.push('webVitals');
        initWebVitals();
    },
}));

describe('initObservability', () => {
    beforeEach(() => {
        vi.resetModules();
        callOrder.length = 0;
        initWebVitalsMeterProvider.mockClear();
        initWebVitals.mockClear();
    });

    it('sets up the MeterProvider before starting web vitals capture', async () => {
        const { initObservability } = await import('./initObservability');
        initObservability();

        // The web vitals capture module is dynamically imported, so let its
        // promise resolve before asserting.
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        expect(callOrder).toEqual(['meterProvider', 'webVitals']);
    });

    it('never throws even if MeterProvider setup fails synchronously', async () => {
        vi.doMock('./webVitalsMeterProvider', () => ({
            initWebVitalsMeterProvider: () => {
                throw new Error('boom');
            },
        }));
        vi.resetModules();

        const { initObservability } = await import('./initObservability');
        expect(() => initObservability()).not.toThrow();
    });
});
