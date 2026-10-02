import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../../../../i18n';
import i18n from 'i18next';
import { DpaPublishDeadlineDialog } from './index';

beforeAll(async () => {
    await i18n.changeLanguage('de');
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: () => ({ matches: false, addListener() {}, removeListener() {} }),
    });
});
afterEach(() => vi.restoreAllMocks());

describe('AVV publication deadline dialog', () => {
    it('starts empty and requires a future Berlin date/time before publishing', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-30T12:00:00Z'));
        const onConfirm = vi.fn();
        const user = userEvent.setup();
        render(<DpaPublishDeadlineDialog onConfirm={onConfirm} onCancel={vi.fn()} />);
        const dialog = screen.getByRole('dialog', { name: /AVV veröffentlichen/ });
        const input = within(dialog).getByLabelText('Unterschriftsfrist (Europe/Berlin)');
        expect(input).toHaveValue('');
        await user.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }));
        expect(
            await screen.findByText('Bitte wählen Sie ein gültiges Datum und eine Uhrzeit in der Zukunft.'),
        ).toBeVisible();
        expect(onConfirm).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { value: '2026-09-30T12:00' } });
        await user.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }));
        expect(onConfirm).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { value: '2026-10-01T15:30' } });
        await user.click(within(dialog).getByRole('button', { name: 'Veröffentlichen' }));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('2026-10-01T15:30:00+02:00'));
    });
    it.each(['cancel', 'escape', 'close'])('does not publish when dismissed through %s', async (gesture) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        const user = userEvent.setup();
        render(<DpaPublishDeadlineDialog onConfirm={onConfirm} onCancel={onCancel} />);
        const dialog = screen.getByRole('dialog', { name: /AVV veröffentlichen/ });
        if (gesture === 'cancel') await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
        if (gesture === 'close') await user.click(within(dialog).getByRole('button', { name: 'Close' }));
        if (gesture === 'escape') fireEvent.keyDown(dialog, { key: 'Escape', keyCode: 27 });
        expect(onCancel).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
