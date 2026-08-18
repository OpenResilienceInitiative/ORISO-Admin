import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DpaLegalReader } from './DpaLegalReader';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string | Record<string, unknown>) =>
            typeof fallback === 'string' ? fallback : key,
        i18n: { language: 'de' },
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
    Element.prototype.scrollIntoView = vi.fn();
});

const LEGAL_HTML =
    '<h1>Präambel</h1><p>Text 1</p><h2>§ 1 Gegenstand</h2><p>Text 2</p><h2>§ 2 Pflichten</h2><p>Text 3</p>';

const chips = (container: HTMLElement) => [...container.querySelectorAll('[data-anchor-chip]')];

/**
 * #594.1 — the reader has NO table of contents of its own: it renders the
 * published text through the canonical read-only rich-text card, whose
 * `AnchorChips` row is the product's one chapter navigation.
 */
describe('DpaLegalReader', () => {
    it('renders the legal text through the canonical read-only card', async () => {
        render(<DpaLegalReader html={LEGAL_HTML} label="AVV" />);

        expect(await screen.findByTestId('m3-editor')).toBeInTheDocument();
        expect(screen.getByTestId('dpa-text')).toHaveTextContent('§ 1 Gegenstand');
        // Reader, not editor: no formatting affordances anywhere.
        expect(screen.queryByTestId('m3-toolbar')).not.toBeInTheDocument();
    });

    it('navigates the chapters with the canonical chip row, one chip per section', async () => {
        const { container } = render(<DpaLegalReader html={LEGAL_HTML} label="AVV" />);

        await waitFor(() => expect(chips(container)).toHaveLength(3));
        expect(chips(container).map((chip) => chip.textContent)).toEqual([
            'Präambel',
            '§ 1 Gegenstand',
            '§ 2 Pflichten',
        ]);
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('moves keyboard focus to the picked section (the behaviour the old TOC had)', async () => {
        const { container } = render(<DpaLegalReader html={LEGAL_HTML} label="AVV" />);
        await waitFor(() => expect(chips(container)).toHaveLength(3));

        fireEvent.click(container.querySelector('[data-anchor-chip="1-gegenstand"] .RichEditor-anchorChipLabel')!);

        const heading = container.querySelector('#1-gegenstand');
        expect(heading).not.toBeNull();
        expect(document.activeElement).toBe(heading);
    });

    /**
     * #594.3 / #572: the reader brings NO scroll container of its own — the
     * host surface scrolls (the viewport-bounded sheet on the desktop, the
     * page on a phone) so there is exactly one scroller on screen and the step
     * can be bounded and centred. Consequently the text region must not be a
     * tab stop either: `scrollable-region-focusable` only asks for one when
     * the region actually scrolls, and an extra stop in front of a 60-page
     * agreement is pure noise.
     */
    it('delegates scrolling to its host and keeps the chapter row outside the text region', async () => {
        const { container } = render(<DpaLegalReader html={LEGAL_HTML} label="AVV" />);
        await waitFor(() => expect(chips(container)).toHaveLength(3));

        const region = screen.getByRole('region', { name: 'AVV' });
        // The chip row is a SIBLING of the text viewport, never inside it.
        expect(region.contains(screen.getByRole('navigation'))).toBe(false);
        expect(region).not.toHaveAttribute('tabindex');
    });

    it('renders text without headings without a chapter row (no empty navigation)', async () => {
        const { container } = render(<DpaLegalReader html="<p>Nur Fließtext.</p>" label="AVV" />);

        await waitFor(() => expect(screen.getByTestId('dpa-text')).toHaveTextContent('Nur Fließtext.'));
        expect(chips(container)).toHaveLength(0);
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('shows an optional intro in the canonical help-text block', async () => {
        render(<DpaLegalReader html={LEGAL_HTML} label="AVV" description="Bitte lesen Sie den Vertrag." />);

        expect(await screen.findByText('Bitte lesen Sie den Vertrag.')).toBeInTheDocument();
    });

    /**
     * Owner report 2026-08-18, H3/I2: "Alles innerhalb blauer area muss weg"
     * named the icon, the title AND the info line as one block. `hideHeader`
     * already existed and dropped the icon/title, but the info line kept
     * rendering regardless — the plumbing existed without covering the whole
     * block it was documented to hide.
     */
    it('hides the intro too when hideHeader is set — the whole header block goes together', async () => {
        render(<DpaLegalReader html={LEGAL_HTML} label="AVV" description="Bitte lesen Sie den Vertrag." hideHeader />);

        await screen.findByTestId('dpa-text');
        expect(screen.queryByText('Bitte lesen Sie den Vertrag.')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'AVV' })).not.toBeInTheDocument();
        // The accessible name of the reading region is unaffected.
        expect(screen.getByRole('region', { name: 'AVV' })).toBeInTheDocument();
    });
});
