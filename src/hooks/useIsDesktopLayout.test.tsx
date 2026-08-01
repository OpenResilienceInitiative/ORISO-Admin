import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT_QUERY, useIsDesktopLayout } from './useIsDesktopLayout.hook';

const Probe = () => <span data-testid="layout">{useIsDesktopLayout() ? 'desktop' : 'mobile'}</span>;

/**
 * Replaces the global stub from `src/test/setup.ts`, which answers
 * `matches: false` to every query. Returns the change listener so a test can
 * simulate a viewport resize.
 */
const stubMatchMedia = (initial: boolean) => {
    const listeners = new Set<() => void>();
    let current = initial;

    vi.stubGlobal(
        'matchMedia',
        vi.fn((query: string) => ({
            get matches() {
                return current;
            },
            media: query,
            addEventListener: (_: string, listener: () => void) => listeners.add(listener),
            removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
        })),
    );

    return (next: boolean) => {
        current = next;
        listeners.forEach((listener) => listener());
    };
};

describe('useIsDesktopLayout', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('matches the @screen-md breakpoint the stylesheet switches on', () => {
        expect(DESKTOP_LAYOUT_QUERY).toBe('(min-width: 768px)');
    });

    it('reports desktop above the breakpoint', () => {
        stubMatchMedia(true);
        render(<Probe />);

        expect(screen.getByTestId('layout')).toHaveTextContent('desktop');
    });

    it('reports mobile below the breakpoint', () => {
        stubMatchMedia(false);
        render(<Probe />);

        expect(screen.getByTestId('layout')).toHaveTextContent('mobile');
    });

    it('follows the viewport across the breakpoint', () => {
        const resize = stubMatchMedia(false);
        render(<Probe />);

        act(() => resize(true));

        expect(screen.getByTestId('layout')).toHaveTextContent('desktop');
    });

    it('assumes desktop where matchMedia does not exist at all', () => {
        vi.stubGlobal('matchMedia', undefined);
        render(<Probe />);

        expect(screen.getByTestId('layout')).toHaveTextContent('desktop');
    });
});
