import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveNavOverflow, useNavOverflow, type UseNavOverflowOptions } from './useNavOverflow.hook';

describe('resolveNavOverflow', () => {
    const at = (width: number, options: Partial<UseNavOverflowOptions> = {}) =>
        resolveNavOverflow(width, { itemCount: 7, ...options });

    it('shows every destination when they all fit', () => {
        expect(at(400, { itemCount: 3 })).toEqual({ visibleCount: 3, hasOverflow: false });
    });

    it('reproduces the Figma layout: 2 destinations plus overflow at 412px', () => {
        // 412px bar − 32 padding − 88 search pill − 16 gap = 276px for the nav.
        expect(at(276)).toEqual({ visibleCount: 2, hasOverflow: true });
    });

    it('keeps the overflow button and drops destinations on a 320px phone', () => {
        // 320 − 32 − 88 − 16 = 184px, room for two segments.
        expect(at(184)).toEqual({ visibleCount: 1, hasOverflow: true });
    });

    it('never drops the overflow segment itself, however narrow the bar gets', () => {
        expect(at(40)).toEqual({ visibleCount: 0, hasOverflow: true });
        expect(at(0)).toEqual({ visibleCount: 0, hasOverflow: true });
    });

    it('respects the M3 cap of five segments on a wide viewport', () => {
        expect(at(2000)).toEqual({ visibleCount: 4, hasOverflow: true });
    });

    it('does not invent an overflow when the cap is not exceeded', () => {
        expect(at(2000, { itemCount: 5 })).toEqual({ visibleCount: 5, hasOverflow: false });
    });

    it('handles a user with no visible destinations at all', () => {
        expect(at(276, { itemCount: 0 })).toEqual({ visibleCount: 0, hasOverflow: false });
    });
});

const Probe = ({ itemCount = 7 }: { itemCount?: number }) => {
    const { ref, visibleCount, hasOverflow } = useNavOverflow({ itemCount });

    return (
        <div ref={ref} data-testid="slot">
            {visibleCount}/{hasOverflow ? 'overflow' : 'complete'}
        </div>
    );
};

const stubWidth = (width: number) =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width } as DOMRect);

describe('useNavOverflow', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        // @ts-expect-error — the stub below is installed per test.
        delete globalThis.ResizeObserver;
    });

    it('measures its element before paint', () => {
        stubWidth(276);
        render(<Probe />);

        expect(screen.getByTestId('slot')).toHaveTextContent('2/overflow');
    });

    it('recomputes when the element is resized', () => {
        stubWidth(276);
        let notify = () => {};
        globalThis.ResizeObserver = class {
            constructor(callback: () => void) {
                notify = callback;
            }

            observe = () => {};

            disconnect = () => {};
        } as unknown as typeof ResizeObserver;

        render(<Probe />);
        expect(screen.getByTestId('slot')).toHaveTextContent('2/overflow');

        stubWidth(184);
        act(() => notify());

        expect(screen.getByTestId('slot')).toHaveTextContent('1/overflow');
    });

    it('falls back to window resize where ResizeObserver is unavailable', () => {
        stubWidth(276);
        render(<Probe />);

        stubWidth(632);
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        expect(screen.getByTestId('slot')).toHaveTextContent('4/overflow');
    });
});
