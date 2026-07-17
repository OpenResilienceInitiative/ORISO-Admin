import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3RichTextEditor } from './M3RichTextEditor';

describe('M3RichTextEditor fullscreen dialog', () => {
    // This is the first test in the file, so it pays the one-off cost of
    // lazily evaluating TipTap/antd Modal module graphs on first render
    // (~1s locally; see the sibling "closes with Escape" test at ~0.4s for
    // the warm-cache baseline). That cold-start cost occasionally pushed
    // this test past vitest's 5s default under loaded/shared CI runners
    // even though nothing here is actually hanging - give it real headroom.
    it('opens a modal dialog on maximize and closes it via the close button', async () => {
        const user = userEvent.setup();
        render(<M3RichTextEditor title="Datenschutz" />);

        await user.click(await screen.findByRole('button', { name: /legal\.m3Editor\.maximize/ }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /legal\.m3Editor\.closeDialog/ }));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    }, 15_000);

    it('closes the dialog with Escape', async () => {
        const user = userEvent.setup();
        render(<M3RichTextEditor title="Datenschutz" />);

        await user.click(await screen.findByRole('button', { name: /legal\.m3Editor\.maximize/ }));
        const dialog = await screen.findByRole('dialog');

        // jsdom leaves focus on <body>; antd listens on the modal wrap, so
        // dispatch Escape on the dialog itself.
        fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 });
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
});

describe('M3RichTextEditor accessibility', () => {
    it('exposes the TipTap contenteditable as a textbox named after the card title', async () => {
        render(<M3RichTextEditor title="Datenschutz" />);

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: 'Datenschutz' })).toBeInTheDocument();
        });
    });

    it('falls back to the default title as accessible name', async () => {
        render(<M3RichTextEditor />);

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: 'Impressum' })).toBeInTheDocument();
        });
    });
});
