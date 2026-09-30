import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            matches: false,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    });
});

describe('M3RichTextEditor shared comparison', () => {
    it('reopens a host-controlled comparison without reopening its previous fullscreen popup', async () => {
        const editor = (open: boolean) => (
            <M3RichTextEditor
                title="Impressum"
                value="<p>Eigener Entwurf</p>"
                enableAnchors={false}
                comparison={{ title: 'Erhaltene Vorlage', html: '<p>Muster</p>', open }}
            />
        );
        const view = render(editor(true));
        await userEvent.click(screen.getByRole('button', { name: 'legal.m3Editor.maximizeTemplate' }));
        await screen.findByRole('dialog', { name: 'Erhaltene Vorlage' });
        view.rerender(editor(false));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Erhaltene Vorlage' })).toBeNull());
        view.rerender(editor(true));
        expect(screen.getByRole('complementary', { name: 'Erhaltene Vorlage' })).toBeVisible();
        expect(screen.queryByRole('dialog', { name: 'Erhaltene Vorlage' })).toBeNull();
    });

    it('opens the full received template in a read-only dialog and returns to the unchanged draft', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <M3RichTextEditor
                title="Impressum"
                value="<p>Eigener Entwurf</p>"
                onChange={onChange}
                enableAnchors={false}
                comparison={{
                    title: 'Erhaltene Vorlage',
                    html: '<h2>Muster</h2><p>Letzter Absatz der Vorlage</p><script>alert(1)</script>',
                    language: 'de',
                    detail: 'Gesendet am 25.09.2026',
                    open: true,
                }}
            />,
        );
        const reference = screen.getByRole('complementary', { name: 'Erhaltene Vorlage' });
        const maximize = within(reference).getByRole('button', { name: 'legal.m3Editor.maximizeTemplate' });
        await user.click(maximize);
        const dialog = await screen.findByRole('dialog', { name: 'Erhaltene Vorlage' });
        expect(dialog).toHaveTextContent('Gesendet am 25.09.2026');
        const document = within(dialog).getByRole('region', { name: 'Erhaltene Vorlage' });
        expect(document).toHaveAttribute('lang', 'de');
        expect(document).toHaveTextContent('Letzter Absatz der Vorlage');
        expect(document.querySelector('script')).toBeNull();
        expect(within(dialog).queryByRole('textbox')).toBeNull();
        const close = within(dialog).getByRole('button', { name: 'legal.m3Editor.closeDialog' });
        close.focus();
        fireEvent.keyDown(close, { key: 'Escape', code: 'Escape', keyCode: 27 });
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Erhaltene Vorlage' })).toBeNull());
        await waitFor(() => expect(maximize).toHaveFocus());
        expect(screen.getByRole('textbox')).toHaveTextContent('Eigener Entwurf');
        onChange.mock.calls.forEach(([html]) => expect(html).toBe('<p>Eigener Entwurf</p>'));
    });

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
