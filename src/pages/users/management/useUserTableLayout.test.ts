import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useUserTableLayout } from './useUserTableLayout';

const atWidth = (width: number) =>
    vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
            ({
                matches: width <= Number(/max-width: (\d+)px/.exec(query)?.[1] ?? Infinity),
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList),
    );

describe('useUserTableLayout', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        [1440, 'wide'],
        [1280, 'wide'],
        [1279, 'compact'],
        [1024, 'compact'],
        [834, 'tablet'],
        [768, 'tablet'],
        [390, 'phone'],
    ])('%ipx is %s', (width, layout) => {
        atWidth(width);
        expect(renderHook(() => useUserTableLayout()).result.current).toBe(layout);
    });
});

describe('available Accounts container width', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.each([
        [599, 'phone'],
        [600, 'tablet'],
        [727, 'tablet'],
        [728, 'compact'],
        [983, 'compact'],
        [984, 'wide'],
    ])('%ipx of content selects %s even in a wide desktop viewport', (width, layout) => {
        atWidth(1920);
        const container = { current: document.createElement('div') };
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(private callback: ResizeObserverCallback) {}

                observe(target: Element) {
                    this.callback(
                        [{ target, contentRect: { width } } as ResizeObserverEntry],
                        this as unknown as ResizeObserver,
                    );
                }

                // eslint-disable-next-line class-methods-use-this
                disconnect() {}
            },
        );
        expect(renderHook(() => useUserTableLayout(container)).result.current).toBe(layout);
    });
});
