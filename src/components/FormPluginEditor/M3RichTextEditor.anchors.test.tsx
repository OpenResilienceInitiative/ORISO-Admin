import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

const scrollIntoViewMock = vi.fn();

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
    Element.prototype.scrollIntoView = scrollIntoViewMock;
});

const content =
    '<h2 id="intro">Intro</h2><p>Hello <a href="#details">jump to details</a></p>' +
    '<h2 id="details">Details</h2><p>World</p>';

const chipSelector = '[data-anchor-chip]';

describe('M3RichTextEditor — anchor navigation (edit mode, default ON)', () => {
    it('renders a horizontal chip row with one removable chip per anchored heading', async () => {
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(screen.getByRole('navigation', { name: 'Section anchors' })).toBeInTheDocument();
        expect(container.querySelectorAll('.RichEditor-anchorNav .RichEditor-anchorChipRemove')).toHaveLength(2);
    });

    it('scrolls the heading into view when a chip is clicked', async () => {
        scrollIntoViewMock.mockClear();
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);
        expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('removes an anchor via the chip "x" and strips the id from the emitted HTML', async () => {
        const onChange = vi.fn();
        const { container } = render(<M3RichTextEditor value={content} onChange={onChange} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="intro"] .RichEditor-anchorChipRemove')!);

        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).not.toContain('id="intro"');
        expect(lastHtml).toContain('data-anchor-removed="true"');
        expect(lastHtml).toContain('id="details"');
    });

    it('stamps readable slug ids onto legacy content and emits them via onChange (data contract)', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <M3RichTextEditor value="<h2>Geltungsbereich</h2><p>Text</p>" onChange={onChange} />,
        );
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).toContain('id="geltungsbereich"');
    });

    it('keeps duplicate heading texts unique with a numeric suffix', async () => {
        const onChange = vi.fn();
        const { container } = render(
            <M3RichTextEditor value="<h2>Kapitel</h2><p>a</p><h2>Kapitel</h2><p>b</p>" onChange={onChange} />,
        );
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        const ids = [...container.querySelectorAll(chipSelector)].map((el) => el.getAttribute('data-anchor-chip'));
        expect(ids).toEqual(['kapitel', 'kapitel-2']);
    });

    it('renders no chip row for content without headings (empty state)', async () => {
        const { container } = render(<M3RichTextEditor value="<p>Nur Fließtext.</p>" />);
        await waitFor(() => expect(container.querySelector('[data-testid="m3-editor"] p')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });

    it('renders no chip row when anchors are disabled via prop', async () => {
        const { container } = render(<M3RichTextEditor value={content} enableAnchors={false} />);
        await waitFor(() => expect(container.querySelector('[data-testid="m3-editor"] h2')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });

    it('renders no internal chip row when an editorSlot owns the content', async () => {
        const { container } = render(<M3RichTextEditor value={content} editorSlot={<div>slot editor</div>} />);
        await screen.findByText('slot editor');
        expect(container.querySelector(chipSelector)).toBeNull();
    });
});

describe('M3RichTextEditor — anchor navigation (read-only)', () => {
    it('shows chips without "x" and marks the clicked chip with a checkmark', async () => {
        const { container } = render(<M3RichTextEditor value={content} readOnly />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(container.querySelectorAll('.RichEditor-anchorChipRemove')).toHaveLength(0);

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        await waitFor(() =>
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy(),
        );
    });

    it('does not invent anchors for headings without ids (content stays untouched)', async () => {
        const { container } = render(<M3RichTextEditor value="<h2>Ohne Anker</h2><p>Text</p>" readOnly />);
        await waitFor(() => expect(container.querySelector('[data-testid="m3-editor"] h2')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });

    it('intercepts in-text #anchor links: scrolls instead of navigating', async () => {
        scrollIntoViewMock.mockClear();
        const { container } = render(<M3RichTextEditor value={content} readOnly />);
        await waitFor(() =>
            expect(container.querySelector('[data-testid="m3-editor"] a[href="#details"]')).toBeTruthy(),
        );

        fireEvent.click(container.querySelector('[data-testid="m3-editor"] a[href="#details"]')!);

        expect(scrollIntoViewMock).toHaveBeenCalled();
    });
});

describe('M3RichTextEditor — anchor HTML round-trip (contract)', () => {
    it('re-rendering emitted HTML yields the same anchors (ids survive the value/getHTML round-trip)', async () => {
        const onChange = vi.fn();
        const first = render(<M3RichTextEditor value="<h2>Geltungsbereich</h2><p>Text</p>" onChange={onChange} />);
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const emitted = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        first.unmount();

        const { container } = render(<M3RichTextEditor value={emitted} readOnly />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        expect(container.querySelector('[data-anchor-chip="geltungsbereich"]')).toBeTruthy();
    });

    it('a removed anchor stays removed after the round-trip (no re-assignment)', async () => {
        const removedHtml =
            '<h2 data-anchor-removed="true">Intro</h2><p>Hello</p><h2 id="details">Details</h2><p>World</p>';
        const { container } = render(<M3RichTextEditor value={removedHtml} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        expect(container.querySelector('[data-anchor-chip="details"]')).toBeTruthy();
        expect(container.querySelector('[data-anchor-chip="intro"]')).toBeNull();
    });
});

describe('M3RichTextEditor — anchors inside the fullscreen dialog', () => {
    it('keeps the anchor row available when maximized into the modal', async () => {
        const { container } = render(<M3RichTextEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(screen.getByRole('button', { name: /legal\.m3Editor\.maximize/ }));

        const dialog = await screen.findByRole('dialog');
        await waitFor(() => expect(dialog.querySelectorAll(chipSelector)).toHaveLength(2));
    });
});
