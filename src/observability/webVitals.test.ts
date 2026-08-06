import { beforeEach, describe, expect, it, vi } from 'vitest';

const histogramsByName: Record<string, { record: ReturnType<typeof vi.fn> }> = {};
const gaugesByName: Record<string, { addCallback: ReturnType<typeof vi.fn> }> = {};
const getMeter = vi.fn();

vi.mock('@opentelemetry/api', () => ({
    metrics: {
        getMeter: (...args: unknown[]) => {
            getMeter(...args);
            return {
                createHistogram: (name: string) => {
                    histogramsByName[name] = { record: vi.fn() };
                    return histogramsByName[name];
                },
                createObservableGauge: (name: string) => {
                    gaugesByName[name] = { addCallback: vi.fn() };
                    return gaugesByName[name];
                },
            };
        },
    },
}));

const webVitalsCallbacks: Record<string, (metric: { name: string; value: number }) => void> = {};

vi.mock('web-vitals', () => ({
    onCLS: (cb: (metric: { name: string; value: number }) => void) => {
        webVitalsCallbacks.CLS = cb;
    },
    onFCP: (cb: (metric: { name: string; value: number }) => void) => {
        webVitalsCallbacks.FCP = cb;
    },
    onINP: (cb: (metric: { name: string; value: number }) => void) => {
        webVitalsCallbacks.INP = cb;
    },
    onLCP: (cb: (metric: { name: string; value: number }) => void) => {
        webVitalsCallbacks.LCP = cb;
    },
    onTTFB: (cb: (metric: { name: string; value: number }) => void) => {
        webVitalsCallbacks.TTFB = cb;
    },
}));

vi.mock('./normalizedPagePath', () => ({
    normalizedPagePath: () => '/admin/agencies/:id',
}));

describe('web vitals capture', () => {
    beforeEach(() => {
        vi.resetModules();
        Object.keys(histogramsByName).forEach((key) => delete histogramsByName[key]);
        Object.keys(gaugesByName).forEach((key) => delete gaugesByName[key]);
        Object.keys(webVitalsCallbacks).forEach((key) => delete webVitalsCallbacks[key]);
        getMeter.mockClear();
    });

    it('uses the "web-vitals" meter name', async () => {
        await import('./webVitals');
        expect(getMeter).toHaveBeenCalledWith('web-vitals');
    });

    it('creates histograms/gauge with exactly the names the SigNoz dashboard queries: lcp, cls, inp, ttfb, fcp', async () => {
        await import('./webVitals');

        expect(Object.keys(histogramsByName).sort()).toEqual(['fcp', 'inp', 'lcp', 'ttfb']);
        expect(Object.keys(gaugesByName)).toEqual(['cls']);
    });

    it('records LCP/INP/TTFB/FCP with only the url.path_template attribute', async () => {
        await import('./webVitals');
        const { initWebVitals } = await import('./webVitals');
        initWebVitals();

        webVitalsCallbacks.LCP({ name: 'LCP', value: 1200 });
        webVitalsCallbacks.INP({ name: 'INP', value: 150 });
        webVitalsCallbacks.TTFB({ name: 'TTFB', value: 300 });
        webVitalsCallbacks.FCP({ name: 'FCP', value: 900 });

        const expectedAttributes = { 'url.path_template': '/admin/agencies/:id' };
        expect(histogramsByName.lcp.record).toHaveBeenCalledWith(1200, expectedAttributes);
        expect(histogramsByName.inp.record).toHaveBeenCalledWith(150, expectedAttributes);
        expect(histogramsByName.ttfb.record).toHaveBeenCalledWith(300, expectedAttributes);
        expect(histogramsByName.fcp.record).toHaveBeenCalledWith(900, expectedAttributes);
    });

    it('never attaches user.id or a user-agent/browser attribute to recorded metrics', async () => {
        await import('./webVitals');
        const { initWebVitals } = await import('./webVitals');
        initWebVitals();

        webVitalsCallbacks.LCP({ name: 'LCP', value: 1200 });

        const [, attributes] = histogramsByName.lcp.record.mock.calls[0];
        expect(Object.keys(attributes)).toEqual(['url.path_template']);
        expect(attributes).not.toHaveProperty('user.id');
        expect(attributes).not.toHaveProperty('browser.name');
        expect(attributes).not.toHaveProperty('user_agent.original');
    });

    it('records CLS via the observable gauge callback', async () => {
        await import('./webVitals');
        const { initWebVitals } = await import('./webVitals');
        initWebVitals();

        webVitalsCallbacks.CLS({ name: 'CLS', value: 0.05 });

        expect(gaugesByName.cls.addCallback).toHaveBeenCalledTimes(1);
        const observeFn = vi.fn();
        const registeredCallback = gaugesByName.cls.addCallback.mock.calls[0][0];
        registeredCallback({ observe: observeFn });

        expect(observeFn).toHaveBeenCalledWith(0.05, { 'url.path_template': '/admin/agencies/:id' });
    });

    it('never throws even if a web-vitals callback registration fails', async () => {
        vi.doMock('web-vitals', () => ({
            onCLS: () => {
                throw new Error('boom');
            },
            onFCP: () => undefined,
            onINP: () => undefined,
            onLCP: () => undefined,
            onTTFB: () => undefined,
        }));
        vi.resetModules();

        const { initWebVitals } = await import('./webVitals');
        expect(() => initWebVitals()).not.toThrow();
    });
});
