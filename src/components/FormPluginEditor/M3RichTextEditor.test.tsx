import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const imageUploadMocks = vi.hoisted(() => ({ uploadTenantMedia: vi.fn() }));
vi.mock('../../api/tenant/uploadTenantMedia', () => ({ uploadTenantMedia: imageUploadMocks.uploadTenantMedia }));

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

    it('moves focus into the text-format menu and restores it on Escape', async () => {
        const user = userEvent.setup();
        render(<M3RichTextEditor title="Datenschutz" />);
        const trigger = await screen.findByTitle(/editor\.headingMenu\.textFormat|Text format/);

        expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);

        const menu = await screen.findByRole('dialog', { name: /editor\.headingMenu\.textFormat|Text format/ });
        await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
        await waitFor(() =>
            expect(screen.getByRole('button', { name: /editor\.headingMenu\.normalText|Normal text/ })).toHaveFocus(),
        );

        fireEvent.keyDown(menu, { key: 'Escape' });
        await waitFor(() => expect(trigger).toHaveFocus());
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('inserts placeholder tokens with their literal braces intact', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <M3RichTextEditor
                title="Datenschutz"
                placeholders={{ responsible: 'editor.plugin.placeholder.option.responsible.label' }}
                onChange={onChange}
            />,
        );

        await user.click(await screen.findByTitle(/editor\.plugin\.placeholder\.select\.placeholder|Placeholder/));
        await user.click(await screen.findByText('editor.plugin.placeholder.option.responsible.label'));

        const expectedTokenHtml = ['<p>$', '{responsible}</p>'].join('');
        await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expectedTokenHtml));
    });
});

describe('M3RichTextEditor image upload integrity', () => {
    it('blocks save and publish until a pending image has been inserted', async () => {
        let resolveUpload: (value: { id: string; url: string; contentType: string }) => void = () => undefined;
        imageUploadMocks.uploadTenantMedia.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveUpload = resolve;
            }),
        );
        const onPublish = vi.fn();
        const onSaveDraft = vi.fn();
        render(<M3RichTextEditor title="Impressum" onPublish={onPublish} onSaveDraft={onSaveDraft} />);
        const editor = await screen.findByRole('textbox', { name: 'Impressum' });

        fireEvent.paste(editor, {
            clipboardData: {
                files: [new File(['image'], 'image.png', { type: 'image/png' })],
                getData: vi.fn(() => ''),
            },
        });

        const publish = screen.getByRole('button', { name: /legal\.m3Editor\.publish|publish/i });
        const saveDraft = screen.getByRole('button', { name: /legal\.m3Editor\.saveDraft|save draft/i });
        await waitFor(() => expect(publish).toBeDisabled());
        expect(saveDraft).toBeDisabled();

        await act(async () => resolveUpload({ id: 'image', url: '/media/image', contentType: 'image/png' }));

        await waitFor(() => expect(publish).toBeEnabled());
        expect(saveDraft).toBeEnabled();
    });
});
