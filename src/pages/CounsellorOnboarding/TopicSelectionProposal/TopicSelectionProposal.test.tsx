import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopicSelectionProposal } from './index';

describe('topic selection design proposal', () => {
    it('cancels draft choices, applies a later choice and preserves it and the entered name across languages', async () => {
        const user = userEvent.setup();
        render(<TopicSelectionProposal />);
        await user.type(screen.getByLabelText('Anzeigename'), 'Georgia');
        await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
        let dialog = within(screen.getByRole('dialog'));
        await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        await user.click(dialog.getByRole('button', { name: 'Abbrechen' }));
        expect(screen.queryByRole('checkbox', { name: 'Schulden entfernen' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
        dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toHaveAttribute('aria-checked', 'false');
        await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        await user.click(dialog.getByRole('button', { name: 'Anwenden' }));
        await user.click(screen.getByRole('button', { name: 'English' }));
        expect(screen.getByLabelText('Display name')).toHaveValue('Georgia');
        expect(screen.getByRole('checkbox', { name: 'Remove Debt' })).toBeVisible();
        await user.click(screen.getByRole('button', { name: 'Choose topics' }));
        dialog = within(screen.getByRole('dialog'));
        await user.type(dialog.getByLabelText('Search topics'), 'Debt');
        expect(dialog.getByRole('checkbox', { name: 'Debt' })).toHaveAttribute('aria-checked', 'true');
        expect(dialog.queryByRole('checkbox', { name: 'Addiction' })).not.toBeInTheDocument();
    });
    it('keeps invitation-fixed topics locked and never offers a topic outside the centre permission', async () => {
        render(<TopicSelectionProposal permission="NONE" fixed initialOpen />);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toBeDisabled();
        expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeDisabled();
        expect(dialog.queryByRole('checkbox', { name: 'Sucht' })).not.toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Eltern und Familie entfernen' })).toBeDisabled();
    });

    it('shows a failed load without permitting apply and lets the reviewer retry the example catalogue', async () => {
        const user = userEvent.setup();
        render(<TopicSelectionProposal initialOpen initialStatus="error" />);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('alert')).toHaveTextContent('Die Themen konnten nicht geladen werden.');
        expect(dialog.getByRole('button', { name: 'Anwenden' })).toBeDisabled();
        await user.click(dialog.getByRole('button', { name: 'Erneut versuchen' }));
        await waitFor(() => expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeVisible());
        expect(dialog.getByRole('button', { name: 'Anwenden' })).toBeEnabled();
    });

    it('limits NONE to one centre topic and preserves the draft when the open dialog changes language', async () => {
        const user = userEvent.setup();
        render(<TopicSelectionProposal permission="NONE" />);
        await user.type(screen.getByLabelText('Anzeigename'), 'Frida');
        await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
        const dialog = within(screen.getByRole('dialog'));
        await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
        expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toHaveAttribute('aria-checked', 'false');
        await user.click(dialog.getByRole('button', { name: 'English' }));
        expect(dialog.getByRole('checkbox', { name: 'Debt' })).toHaveAttribute('aria-checked', 'true');
        expect(dialog.queryByRole('checkbox', { name: 'Addiction' })).not.toBeInTheDocument();
        await user.click(dialog.getByRole('button', { name: 'Apply' }));
        expect(screen.getByLabelText('Display name')).toHaveValue('Frida');
        expect(screen.getByRole('checkbox', { name: 'Remove Debt' })).toBeVisible();
        expect(screen.queryByRole('checkbox', { name: 'Remove Parents and family' })).not.toBeInTheDocument();
    });
    it('offers only the centre topics for SELECT_EXISTING', () => {
        render(<TopicSelectionProposal permission="SELECT_EXISTING" initialOpen />);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.getByRole('checkbox', { name: 'Schulden' })).toBeEnabled();
        expect(dialog.queryByRole('checkbox', { name: 'Sucht' })).not.toBeInTheDocument();
    });
});

it('retains the last required topic in both the applied summary and the draft', async () => {
    const user = userEvent.setup();
    render(<TopicSelectionProposal />);
    expect(screen.getByRole('checkbox', { name: 'Eltern und Familie entfernen' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Themen auswählen' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('checkbox', { name: 'Eltern und Familie' }));
    expect(dialog.getByRole('checkbox', { name: 'Eltern und Familie' })).toHaveAttribute('aria-checked', 'true');
    await user.click(dialog.getByRole('checkbox', { name: 'Schulden' }));
    await user.click(dialog.getByRole('checkbox', { name: 'Eltern und Familie' }));
    await user.click(dialog.getByRole('button', { name: 'Anwenden' }));
    expect(screen.getByRole('checkbox', { name: 'Schulden entfernen' })).toBeDisabled();
});
