import { useState } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3RichTextEditor } from './M3RichTextEditor';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'de' },
    }),
}));

beforeAll(() => {
    document.elementFromPoint = () => document.body;
    Range.prototype.getClientRects = () => ({ length: 0, item: () => null } as unknown as DOMRectList);
    Range.prototype.getBoundingClientRect = () => new DOMRect();
});

describe('M3RichTextEditor edit and save action', () => {
    it('opens editing with a pressed pencil, then saves through the same control', async () => {
        const user = userEvent.setup();
        const save = vi.fn();
        const Controlled = () => {
            const [value, setValue] = useState('<p>Alt</p>');
            const [dirty, setDirty] = useState(false);
            return (
                <M3RichTextEditor
                    title="Impressum"
                    value={value}
                    dirty={dirty}
                    onChange={(next) => {
                        setValue(next);
                        setDirty(true);
                    }}
                    onSaveDraft={(next) => {
                        save(next);
                        setDirty(false);
                    }}
                />
            );
        };

        render(<Controlled />);
        const edit = screen.getByRole('button', { name: 'edit' });
        expect(edit).toHaveAttribute('aria-pressed', 'false');
        expect(screen.queryByRole('textbox', { name: 'Impressum' })).not.toBeInTheDocument();

        await user.click(edit);
        expect(edit).toHaveAttribute('aria-pressed', 'true');
        const textbox = await screen.findByRole('textbox', { name: 'Impressum' });
        await user.click(textbox);
        await user.type(textbox, ' neu');

        const saveButton = await screen.findByRole('button', { name: 'save' });
        expect(saveButton).toHaveAttribute('aria-pressed', 'true');
        await user.click(saveButton);
        expect(save).toHaveBeenCalledTimes(1);
        expect(save.mock.calls[0][0]).toContain('neu');
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'edit' })).toHaveAttribute('aria-pressed', 'false'),
        );
    });

    it('keeps a pre-existing unsaved draft saveable', () => {
        render(<M3RichTextEditor title="Datenschutz" value="<p>Entwurf</p>" dirty onSaveDraft={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'save' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('textbox', { name: 'Datenschutz' })).toBeInTheDocument();
    });

    it('keeps the edited text saveable when storage reports failure', async () => {
        const user = userEvent.setup();
        const save = vi.fn(() => false);
        render(<M3RichTextEditor title="Datenschutz" value="<p>Alt</p>" onChange={vi.fn()} onSaveDraft={save} />);

        await user.click(screen.getByRole('button', { name: 'edit' }));
        await user.type(screen.getByRole('textbox', { name: 'Datenschutz' }), ' neu');
        const saveButton = await screen.findByRole('button', { name: 'save' });
        await user.click(saveButton);

        expect(save).toHaveBeenCalledOnce();
        expect(saveButton).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('textbox', { name: 'Datenschutz' })).toBeInTheDocument();
    });
});
