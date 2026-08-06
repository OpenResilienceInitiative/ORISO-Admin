import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import TiptapEditor from './TiptapEditor';

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

describe('TiptapEditor — anchor navigation (edit mode)', () => {
    it('renders a chip per anchored heading, each with an "x" close button', async () => {
        const { container } = render(<TiptapEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(container.querySelectorAll('.RichEditor-anchorNav .RichEditor-anchorChipRemove')).toHaveLength(2);
    });

    it('scrolls the heading into view when a chip is clicked', async () => {
        scrollIntoViewMock.mockClear();
        const { container } = render(<TiptapEditor value={content} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);
        expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('removes the anchor via the chip "x": chip disappears and the id is stripped from the HTML', async () => {
        const onChange = vi.fn();
        const { container } = render(<TiptapEditor value={content} onChange={onChange} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));

        fireEvent.click(container.querySelector('[data-anchor-chip="intro"] .RichEditor-anchorChipRemove')!);

        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        expect(container.querySelector('[data-anchor-chip="details"]')).toBeTruthy();

        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).not.toContain('id="intro"');
        expect(lastHtml).toContain('data-anchor-removed="true"');
        expect(lastHtml).toContain('id="details"');
    });

    it('stamps ids onto legacy content without anchors when opened for editing', async () => {
        const onChange = vi.fn();
        const { container } = render(<TiptapEditor value="<h2>Geltungsbereich</h2><p>Text</p>" onChange={onChange} />);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(1));
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).toContain('id="geltungsbereich"');
    });

    it('renders no chip row when anchors are disabled', async () => {
        const { container } = render(<TiptapEditor value={content} enableAnchors={false} />);
        await waitFor(() => expect(container.querySelector('.RichEditor-editor h2')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });
});

describe('TiptapEditor — anchor navigation (read-only viewer)', () => {
    const renderReadOnly = (html: string) =>
        render(
            <ConfigProvider componentDisabled>
                <TiptapEditor value={html} />
            </ConfigProvider>,
        );

    it('shows chips without "x" and marks the clicked chip with a checkmark', async () => {
        const { container } = renderReadOnly(content);
        await waitFor(() => expect(container.querySelectorAll(chipSelector)).toHaveLength(2));
        expect(container.querySelectorAll('.RichEditor-anchorChipRemove')).toHaveLength(0);

        fireEvent.click(container.querySelector('[data-anchor-chip="details"] .RichEditor-anchorChipLabel')!);

        await waitFor(() =>
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy(),
        );
        expect(container.querySelector('[data-anchor-chip="intro"].RichEditor-anchorChip--active')).toBeNull();
    });

    it('does not invent anchors for headings without ids (content stays untouched)', async () => {
        const { container } = renderReadOnly('<h2>Ohne Anker</h2><p>Text</p>');
        await waitFor(() => expect(container.querySelector('.RichEditor-editor h2')).toBeTruthy());
        expect(container.querySelector(chipSelector)).toBeNull();
    });

    it('intercepts in-text #anchor links: scrolls instead of navigating', async () => {
        scrollIntoViewMock.mockClear();
        const { container } = renderReadOnly(content);
        await waitFor(() => expect(container.querySelector('.RichEditor-editor a[href="#details"]')).toBeTruthy());

        fireEvent.click(container.querySelector('.RichEditor-editor a[href="#details"]')!);

        expect(scrollIntoViewMock).toHaveBeenCalled();
        // The clicked target becomes the active chip (checkmark).
        await waitFor(() =>
            expect(container.querySelector('[data-anchor-chip="details"].RichEditor-anchorChip--active')).toBeTruthy(),
        );
    });
});
