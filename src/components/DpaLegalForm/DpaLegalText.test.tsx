import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildAnchoredLegalHtml, DpaLegalText } from './DpaLegalText';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

const MULTI_SECTION_HTML =
    '<h2>Präambel</h2><p>Text 1</p>' +
    '<h2 id="evil-id">§ 1 Gegenstand</h2><p>Text 2</p>' +
    '<h3>§ 1.1 Details</h3><p>Text 3</p>';

describe('buildAnchoredLegalHtml', () => {
    it('assigns generated anchor ids and focus targets to every section heading', () => {
        const { html, toc } = buildAnchoredLegalHtml(MULTI_SECTION_HTML);

        expect(toc).toEqual([
            { id: 'dpa-section-1', text: 'Präambel', level: 2 },
            { id: 'dpa-section-2', text: '§ 1 Gegenstand', level: 2 },
            { id: 'dpa-section-3', text: '§ 1.1 Details', level: 3 },
        ]);
        // Content-supplied ids are overwritten, never trusted.
        expect(html).not.toContain('evil-id');
        expect(html).toContain('id="dpa-section-2"');
        expect(html).toContain('tabindex="-1"');
    });

    it('returns an empty TOC for heading-less or empty content', () => {
        expect(buildAnchoredLegalHtml('<p>Nur Fließtext</p>').toc).toEqual([]);
        expect(buildAnchoredLegalHtml('').toc).toEqual([]);
    });
});

describe('DpaLegalText', () => {
    it('renders TOC (side nav + compact dropdown) for multi-section texts', () => {
        render(<DpaLegalText html={MULTI_SECTION_HTML} label="AVV" />);

        const nav = screen.getByTestId('dpa-toc');
        expect(nav).toHaveAccessibleName('dpaToc.label');
        expect(screen.getAllByRole('button', { name: '§ 1 Gegenstand' })).toHaveLength(1);
        expect(screen.getByTestId('dpa-toc-select')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'AVV' })).toHaveAttribute('tabindex', '0');
    });

    it('renders no TOC when the text has fewer than two sections', () => {
        render(<DpaLegalText html="<h2>Nur ein Abschnitt</h2><p>Text</p>" label="AVV" />);

        expect(screen.queryByTestId('dpa-toc')).not.toBeInTheDocument();
        expect(screen.queryByTestId('dpa-toc-select')).not.toBeInTheDocument();
    });

    it('moves keyboard focus to the target section when a TOC entry is activated', async () => {
        const user = userEvent.setup();
        render(<DpaLegalText html={MULTI_SECTION_HTML} label="AVV" />);

        await user.click(screen.getByRole('button', { name: '§ 1 Gegenstand' }));

        const region = screen.getByTestId('dpa-text');
        const target = region.querySelector('#dpa-section-2');
        expect(target).not.toBeNull();
        expect(document.activeElement).toBe(target);
    });

    it('jumps via the compact dropdown too (focus follows)', async () => {
        const user = userEvent.setup();
        render(<DpaLegalText html={MULTI_SECTION_HTML} label="AVV" />);

        await user.selectOptions(screen.getByTestId('dpa-toc-select'), 'dpa-section-3');

        const target = screen.getByTestId('dpa-text').querySelector('#dpa-section-3');
        expect(document.activeElement).toBe(target);
    });

    it('scrolls the ancestor (scrollIntoView) in container mode', async () => {
        const scrollIntoView = vi.fn();
        // jsdom implements neither scroll API — the component guards both.
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            writable: true,
            value: scrollIntoView,
        });
        const user = userEvent.setup();
        render(<DpaLegalText html={MULTI_SECTION_HTML} label="AVV" scrollMode="container" />);

        await user.click(screen.getByRole('button', { name: 'Präambel' }));

        expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }));
    });
});
