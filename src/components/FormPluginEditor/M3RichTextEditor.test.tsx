import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { M3RichTextEditor } from './M3RichTextEditor';

// Rendering the TipTap editor + antd modal is the heaviest jsdom setup in the
// suite; on loaded CI runners it can exceed vitest's default 5s per-test budget,
// so the dialog tests get an explicit timeout.
const DIALOG_TEST_TIMEOUT = 15_000;

describe('M3RichTextEditor fullscreen dialog', () => {
    it(
        'opens a modal dialog on maximize and closes it via the close button',
        async () => {
            const user = userEvent.setup();
            render(<M3RichTextEditor title="Datenschutz" />);

            await user.click(await screen.findByRole('button', { name: /legal\.m3Editor\.maximize/ }));

            expect(await screen.findByRole('dialog')).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: /legal\.m3Editor\.closeDialog/ }));
            await waitFor(() => {
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            });
        },
        DIALOG_TEST_TIMEOUT,
    );

    it(
        'closes the dialog with Escape',
        async () => {
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
        },
        DIALOG_TEST_TIMEOUT,
    );
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
