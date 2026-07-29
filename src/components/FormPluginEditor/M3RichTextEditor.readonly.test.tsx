import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

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

const anchored = '<h2 id="intro">Intro</h2><p>Hello</p><h2 id="details">Details</h2><p>World</p>';

/**
 * #594.2 — read-only is a READER, not a disabled editor: formatting controls
 * make no sense when nothing can be edited. The fix lives in the shared
 * component so every consumer (legal cards, agency view, the public DPA
 * surfaces) benefits.
 */
describe('M3RichTextEditor — read-only mode hides the editing affordances', () => {
    /**
     * The positive control for the test below. `queryByTitle(...)` proves
     * nothing on its own: `t` is mocked to return the English fallback, so if
     * the toolbar ever stopped passing exactly these strings the "not in the
     * document" assertions would pass for the wrong reason. This pins the
     * titles the toolbar really renders, so that failure mode is loud.
     */
    it('renders those very controls on an EDITABLE card (pins the titles below)', async () => {
        render(<M3RichTextEditor title="AVV" value={anchored} />);

        expect(await screen.findByTitle('Bold')).toBeInTheDocument();
        expect(screen.getByTitle('Add image')).toBeInTheDocument();
    });

    it('renders no formatting toolbar at all when readOnly', async () => {
        render(<M3RichTextEditor title="AVV" value={anchored} readOnly />);

        await waitFor(() => expect(screen.getByRole('region', { name: 'AVV' })).toBeInTheDocument());
        expect(screen.queryByTestId('m3-toolbar')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Bold')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Add image')).not.toBeInTheDocument();
    });

    it('keeps the fullscreen control — reading a long text full-screen is not editing', async () => {
        render(<M3RichTextEditor title="AVV" value={anchored} readOnly />);

        expect(await screen.findByRole('button', { name: 'legal.m3Editor.maximize' })).toBeInTheDocument();
    });

    it('drops the dead version control when a reader has no versions to look back at', async () => {
        render(<M3RichTextEditor title="AVV" value={anchored} readOnly />);

        await waitFor(() => expect(screen.getByRole('region', { name: 'AVV' })).toBeInTheDocument());
        expect(screen.queryByTitle('legal.m3Editor.versionHistory')).not.toBeInTheDocument();
    });

    it('keeps the version control for a read-only card that HAS versions (agency look-back)', async () => {
        render(
            <M3RichTextEditor
                title="AVV"
                value={anchored}
                readOnly
                versions={[{ id: '2026-01-15', label: 'Jan 2026', content: '<p>alt</p>' }]}
            />,
        );

        expect(await screen.findByTitle('legal.m3Editor.versionHistory')).toBeInTheDocument();
    });

    /**
     * Regression guard for the consumers that rely on today's behaviour: the
     * version look-back (Figma 1261-51137) deliberately keeps the formatting
     * bar visible but inert. Only the explicit `readOnly` prop removes it.
     */
    it('keeps the inert toolbar while looking back at a version of an EDITABLE card', async () => {
        const { container } = render(
            <M3RichTextEditor
                title="AVV"
                value="<p>Entwurf</p>"
                versions={[{ id: '2026-01-15', label: 'Jan 2026', content: '<p>alt</p>' }]}
            />,
        );

        fireEvent.click(await screen.findByTitle('legal.m3Editor.versionHistory'));
        fireEvent.click(await screen.findByText('legal.m3Editor.versionVariant'));

        await waitFor(() => expect(container.querySelector('.tiptap')?.getAttribute('contenteditable')).toBe('false'));
        expect(screen.getByTestId('m3-toolbar')).toBeInTheDocument();
        expect(container.querySelector('fieldset')).toBeDisabled();
    });
});

/**
 * #594.1 — the DPA reader reuses this component, so the "jump moves keyboard
 * focus to the section" behaviour that DpaLegalText had must live here.
 */
describe('M3RichTextEditor — anchor jump moves keyboard focus (reading mode)', () => {
    it('focuses the target heading when a chapter chip is used', async () => {
        const { container } = render(<M3RichTextEditor title="AVV" value={anchored} readOnly />);
        await waitFor(() => expect(container.querySelectorAll('[data-anchor-chip]')).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        const heading = container.querySelector('#details');
        expect(heading).not.toBeNull();
        expect(document.activeElement).toBe(heading);
        expect(heading).toHaveAttribute('tabindex', '-1');
    });

    it('does not steal the caret out of an editable document', async () => {
        const { container } = render(<M3RichTextEditor title="AVV" value={anchored} />);
        await waitFor(() => expect(container.querySelectorAll('[data-anchor-chip]')).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        expect(document.activeElement).not.toBe(container.querySelector('#details'));
    });
});

describe('M3RichTextEditor — reading surface semantics', () => {
    it('exposes the read-only text as a named, keyboard-reachable region (not a text input)', async () => {
        render(<M3RichTextEditor title="AVV" value={anchored} readOnly />);

        const region = await screen.findByRole('region', { name: 'AVV' });
        expect(region).toHaveAttribute('tabindex', '0');
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('keeps the labelled textbox for the editable card', async () => {
        render(<M3RichTextEditor title="AVV" value={anchored} />);

        expect(await screen.findByRole('textbox', { name: 'AVV' })).toBeInTheDocument();
    });
});
