import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

describe('M3RichTextEditor plainText mode', () => {
    it('keeps the full formatting bar by default', async () => {
        render(<M3RichTextEditor title="Datenschutz" />);

        expect(await screen.findByTestId('m3-toolbar')).toBeInTheDocument();
    });

    it('renders no formatting bar and no fullscreen control with plainText', async () => {
        render(<M3RichTextEditor title="Erstantwort" plainText />);

        expect(await screen.findByRole('textbox', { name: /Erstantwort/ })).toBeInTheDocument();
        expect(screen.queryByTestId('m3-toolbar')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /legal\.m3Editor\.maximize/ })).not.toBeInTheDocument();
    });

    it('reduces pasted formatted content to plain paragraphs', async () => {
        const onChange = vi.fn();
        render(<M3RichTextEditor title="Erstantwort" plainText onChange={onChange} />);
        const box = await screen.findByRole('textbox', { name: /Erstantwort/ });

        fireEvent.paste(box, {
            clipboardData: {
                getData: (type: string) => (type === 'text/plain' ? 'Eins\n\nZwei' : '<p><b>Eins</b></p><p>Zwei</p>'),
                files: [],
                items: [],
            },
        });

        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith('<p>Eins</p><p>Zwei</p>');
    });
});
