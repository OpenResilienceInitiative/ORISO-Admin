import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('M3RichTextEditor shared comparison', () => {
    it('opens one sanitized read-only reference beside the existing editable draft', async () => {
        const onChange = vi.fn();
        render(
            <M3RichTextEditor
                title="Impressum"
                value="<p>Eigener Entwurf</p>"
                onChange={onChange}
                enableAnchors={false}
                comparison={{ title: 'Erhaltene Vorlage', html: '<p>Muster</p><script>alert(1)</script>' }}
            />,
        );
        await userEvent.click(await screen.findByRole('button', { name: 'legal.m3Editor.compareTemplate' }));
        const reference = screen.getByRole('complementary', { name: 'Erhaltene Vorlage' });
        expect(reference).toHaveTextContent('Muster');
        expect(reference.querySelector('script')).toBeNull();
        expect(within(reference).queryByRole('textbox')).toBeNull();
        expect(screen.getAllByRole('textbox')).toHaveLength(1);
        expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'true');
        onChange.mock.calls.forEach(([html]) => expect(html).toBe('<p>Eigener Entwurf</p>'));
        await userEvent.click(screen.getAllByRole('button', { name: 'legal.m3Editor.closeComparison' })[0]);
        await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull());
        expect(screen.getByRole('textbox')).toHaveTextContent('Eigener Entwurf');
    });

    it('allows comparison on a read-only editor without making either text editable', async () => {
        const { container } = render(
            <M3RichTextEditor
                title="Impressum"
                value="<p>Online-Fassung</p>"
                readOnly
                enableAnchors={false}
                comparison={{ title: 'Vorlage', html: '<p>Muster</p>' }}
            />,
        );
        await userEvent.click(await screen.findByRole('button', { name: 'legal.m3Editor.compareTemplate' }));
        expect(screen.getByRole('complementary', { name: 'Vorlage' })).toHaveTextContent('Muster');
        expect(container.querySelector('.tiptap')).toHaveAttribute('contenteditable', 'false');
    });
});
