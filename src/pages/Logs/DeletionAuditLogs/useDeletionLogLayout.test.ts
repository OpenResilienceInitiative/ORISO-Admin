import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMBINED_MIN, deletionLogLayoutFor, useDeletionLogLayout, WIDE_MIN } from './useDeletionLogLayout';

const viewport = (matches: boolean) =>
    vi.spyOn(window, 'matchMedia').mockImplementation(
        (query: string) =>
            ({
                matches,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            } as unknown as MediaQueryList),
    );

describe('deletionLogLayoutFor', () => {
    it.each([
        [WIDE_MIN + 200, 'wide'],
        [WIDE_MIN, 'wide'],
        [WIDE_MIN - 1, 'combined'],
        [COMBINED_MIN, 'combined'],
        [COMBINED_MIN - 1, 'cards'],
        [390, 'cards'],
    ])('%ipx of container is %s', (width, layout) => {
        expect(deletionLogLayoutFor(width)).toBe(layout);
    });
});

describe('useDeletionLogLayout', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    const measured = (width: number) => {
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
        return { current: document.createElement('div') };
    };

    it('uses the container width, not a wide desktop viewport', () => {
        viewport(false);
        expect(renderHook(() => useDeletionLogLayout(measured(500))).result.current).toBe('cards');
    });

    it('keeps the wide table in a wide container even on a phone-sized viewport', () => {
        viewport(true);
        expect(renderHook(() => useDeletionLogLayout(measured(WIDE_MIN))).result.current).toBe('wide');
    });

    it('falls back to the viewport before the first measurement', () => {
        viewport(true);
        expect(renderHook(() => useDeletionLogLayout({ current: null })).result.current).toBe('cards');
        viewport(false);
        expect(renderHook(() => useDeletionLogLayout({ current: null })).result.current).toBe('wide');
    });
});
