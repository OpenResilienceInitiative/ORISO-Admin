import type { Editor } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    it('strips rich nodes and marks from loaded content in plain-text mode', async () => {
        render(<M3RichTextEditor title="Erstantwort" plainText value="<h1>Heading</h1><p><strong>Bold</strong></p>" />);
        const box = await screen.findByRole('textbox', { name: /Erstantwort/ });
        expect(box.querySelector('h1, strong')).toBeNull();
        expect(box).toHaveTextContent('Heading');
        expect(box).toHaveTextContent('Bold');
    });

    it('cannot create a heading or bold text through editor commands in plain-text mode', async () => {
        const onChange = vi.fn();
        render(<M3RichTextEditor title="Erstantwort" plainText onChange={onChange} />);
        const box = await screen.findByRole('textbox', { name: /Erstantwort/ });
        const { editor } = box as HTMLElement & { editor: Editor };
        act(() => {
            editor.commands.insertContent('<h1>Title</h1><p><strong>Text</strong></p>');
        });
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        expect(onChange).toHaveBeenLastCalledWith('<p>Title</p><p>Text</p>');
    });

    it('rejects external rich HTML drops instead of adding formatting', async () => {
        const onChange = vi.fn();
        render(<M3RichTextEditor title="Erstantwort" plainText onChange={onChange} />);
        const box = await screen.findByRole('textbox', { name: /Erstantwort/ });
        const drop = new Event('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(drop, 'dataTransfer', {
            value: { getData: () => '<h1>Rich</h1>', files: [], types: ['text/html'] },
        });
        onChange.mockClear();
        fireEvent(box, drop);
        expect(drop.defaultPrevented).toBe(true);
        expect(box.querySelector('h1')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });
});
