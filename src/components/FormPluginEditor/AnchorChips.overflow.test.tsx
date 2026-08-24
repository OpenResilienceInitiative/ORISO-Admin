import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import AnchorChips from './AnchorChips';
import type { HeadingAnchor } from './headingAnchors';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const anchors: HeadingAnchor[] = [
    { id: 'rechtsdokumente', text: 'Rechtsdokumente', level: 1, pos: 0 },
    { id: 'anlage-1-avv', text: 'Anlage 1: AVV', level: 2, pos: 10 },
    { id: 'anlage-2', text: 'Anlage 2: Beratungsgrundsätze', level: 2, pos: 20 },
    { id: 'anlage-3', text: 'Anlage 3: Leistungsumfang und Verfügbarkeit', level: 3, pos: 30 },
];

/**
 * jsdom has no layout: scrollWidth/clientWidth are 0 and the row never
 * overflows. These prototype mocks simulate the owner's screenshot geometry
 * (2026-08-18 before-state H4/I3): a chip row wider than its scrollport,
 * scrolled to the start — the state in which the last chip was hard-clipped
 * down to a single letter.
 */
const mockRowGeometry = ({ scrollWidth, clientWidth, scrollLeft }: Record<string, number>) => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => scrollWidth });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => clientWidth });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
        configurable: true,
        get: () => scrollLeft,
        set: () => {},
    });
};

describe('AnchorChips — overflow affordance (before-state H4/I3, 2026-08-18)', () => {
    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', undefined);
    });

    afterEach(() => {
        // Remove the shadowing own properties again — jsdom's originals live on
        // Element.prototype and become visible again automatically.
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
        Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollLeft');
        vi.unstubAllGlobals();
    });

    it('fades only the end while the row sits at its start (the screenshot state)', async () => {
        // Geometry of the owner's screenshot: 4 chips ≈ 990px in a 762px
        // scrollport (production measurement at 3fb58d9: scrollWidth 990,
        // clientWidth 762, last chip clipped by 228px).
        mockRowGeometry({ scrollWidth: 990, clientWidth: 762, scrollLeft: 0 });
        const { container } = render(<AnchorChips anchors={anchors} onSelect={() => {}} />);

        await waitFor(() => {
            const row = container.querySelector('.RichEditor-anchorNavRow')!;
            expect(row.classList.contains('RichEditor-anchorNavRow--fadeEnd')).toBe(true);
            expect(row.classList.contains('RichEditor-anchorNavRow--fadeStart')).toBe(false);
        });
        // The forward arrow is the second half of the affordance.
        expect(container.querySelector('.RichEditor-anchorNavBtn')).toBeTruthy();
    });

    it('fades both edges mid-scroll', async () => {
        mockRowGeometry({ scrollWidth: 990, clientWidth: 762, scrollLeft: 100 });
        const { container } = render(<AnchorChips anchors={anchors} onSelect={() => {}} />);

        await waitFor(() => {
            const row = container.querySelector('.RichEditor-anchorNavRow')!;
            expect(row.classList.contains('RichEditor-anchorNavRow--fadeEnd')).toBe(true);
            expect(row.classList.contains('RichEditor-anchorNavRow--fadeStart')).toBe(true);
        });
    });

    it('shows no fade at all when every chip fits', async () => {
        mockRowGeometry({ scrollWidth: 500, clientWidth: 762, scrollLeft: 0 });
        const { container } = render(<AnchorChips anchors={anchors} onSelect={() => {}} />);

        await waitFor(() => expect(container.querySelector('.RichEditor-anchorNavRow')).toBeTruthy());
        const row = container.querySelector('.RichEditor-anchorNavRow')!;
        expect(row.classList.contains('RichEditor-anchorNavRow--fadeEnd')).toBe(false);
        expect(row.classList.contains('RichEditor-anchorNavRow--fadeStart')).toBe(false);
    });
});
