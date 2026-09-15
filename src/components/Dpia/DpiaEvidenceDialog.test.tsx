import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DpiaDocumentPage } from './DpiaDocumentPage';
import { DPIA_CHAPTERS } from './DpiaChapters';
import source from './__fixtures__/dsfa-source.json';

const renderPage = () => render(<DpiaDocumentPage chapters={DPIA_CHAPTERS} initialShowInternalNotes />);

describe('DPIA evidence dialog', () => {
    it('names the trigger by its claim, exposes code provenance and restores focus after Escape', async () => {
        const user = userEvent.setup();
        renderPage();
        const trigger = screen.getByRole('button', { name: 'Evidenz anzeigen: E2EE wird serverseitig erzwungen' });
        await user.click(trigger);
        const dialog = await screen.findByRole('dialog', { name: /E2EE wird serverseitig erzwungen/ });
        await waitFor(() => expect(within(dialog).getByText(source.evidence['e2ee-enforced'].what)).toBeVisible());
        expect(within(dialog).getByText('Raumanlage: m.room.encryption')).toBeVisible();
        expect(within(dialog).getByText('Zeilen 112–123')).toBeVisible();
        within(dialog)
            .getAllByRole('link')
            .forEach((link) => {
                expect(link.getAttribute('href')).toMatch(/^https:\/\//);
                expect(link).toHaveAttribute('rel', 'noopener noreferrer');
            });
        within(dialog).getByRole('button', { name: 'Close' }).focus();
        // rc-dialog uses the browser's legacy keyCode; jsdom user-event leaves it at zero.
        fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Close' }), { key: 'Escape', keyCode: 27 });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(trigger).toHaveFocus());
    });
    it('dismisses from the backdrop and returns focus to the original trigger', async () => {
        const user = userEvent.setup();
        renderPage();
        const trigger = screen.getByRole('button', { name: 'Evidenz anzeigen: Olm/Megolm sind offen spezifiziert' });
        await user.click(trigger);
        await waitFor(() => expect(screen.getByRole('dialog')).toBeVisible());
        await user.click(screen.getByTestId('dpia-evidence-backdrop'));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await waitFor(() => expect(trigger).toHaveFocus());
    });
});
