import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { M3RichTextEditor } from './M3RichTextEditor';

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
