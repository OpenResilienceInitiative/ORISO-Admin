import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
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

describe('M3RichTextEditor — trailing-paragraph guarantee is wired into the editor', () => {
    it('a doc-changing edit on a heading-final document emits HTML that ends in a paragraph', async () => {
        const onChange = vi.fn();
        // Heading-final document (the owner's caret trap). The chip "x" is an
        // ordinary doc-changing transaction through the REAL component
        // pipeline — after it, the guarantee paragraph must exist.
        const { container } = render(<M3RichTextEditor value='<h2 id="intro">Intro</h2>' onChange={onChange} />);
        await waitFor(() => expect(container.querySelectorAll('[data-anchor-chip]')).toHaveLength(1));

        fireEvent.click(container.querySelector('[data-anchor-chip="intro"] .RichEditor-anchorChipRemove')!);

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;
        expect(lastHtml).toMatch(/<p><\/p>$/);
    });
});
