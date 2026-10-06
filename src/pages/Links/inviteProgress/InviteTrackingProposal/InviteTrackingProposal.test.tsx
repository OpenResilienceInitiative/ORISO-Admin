import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteTrackingProposal } from './index';

describe('invitation tracking design proposal', () => {
    it('explains replaced history without erasing reached milestones or claiming account failure', async () => {
        const user = userEvent.setup();
        render(<InviteTrackingProposal initialView="history" />);
        const row = screen.getByRole('article', { name: 'Frida Beispiel · INV-204' });
        await user.click(within(row).getByRole('button', { name: 'Ersetzt · Erklärung' }));
        expect(within(row).getByRole('note')).toHaveTextContent('Diese Einladung ist geschlossen');
        expect(within(row).getAllByText('30.09., 22:12')).toHaveLength(1);
        expect(within(row).getByRole('button', { name: /Konto angelegt · Noch nicht erreicht/ })).toBeVisible();
        expect(within(row).queryByRole('button', { name: /Konto angelegt · Fehlgeschlagen/ })).not.toBeInTheDocument();
        within(row).getByRole('button', { name: 'Erklärung schließen' }).focus();
        await user.keyboard('{Escape}');
        expect(within(row).getByRole('button', { name: 'Ersetzt · Erklärung' })).toHaveFocus();
        expect(within(row).queryByRole('note')).not.toBeInTheDocument();
    });
});

it('separates existing-account assignment, password setup and confirmed setup failure from new-account creation', async () => {
    const user = userEvent.setup();
    render(<InviteTrackingProposal locale="en" />);
    const assignment = screen.getByRole('article', { name: 'Sam Beispiel · INV-208' });
    expect(within(assignment).getByRole('button', { name: /Assignment confirmed · Reached/ })).toBeVisible();
    expect(within(assignment).queryByRole('button', { name: /Account created/ })).not.toBeInTheDocument();
    const password = screen.getByRole('article', { name: 'Ari Beispiel · INV-211' });
    expect(within(password).getByRole('button', { name: /Password set up · Next step/ })).toBeVisible();
    const failure = screen.getByRole('article', { name: 'Dana Beispiel · INV-213' });
    await user.click(within(failure).getByRole('button', { name: /Setup problem · Explanation/ }));
    expect(within(failure).getByRole('note')).toHaveTextContent('The account exists');
});

it('keeps a role edit separate from an explicit simulated resend and follows only the supplied replacement reference', async () => {
    const user = userEvent.setup();
    render(<InviteTrackingProposal />);
    const row = screen.getByRole('article', { name: 'Frida Beispiel · INV-205' });
    await user.selectOptions(within(row).getByRole('combobox', { name: 'Rolle' }), 'admin');
    expect(screen.getByRole('status')).toHaveTextContent('Es wurde keine E-Mail gesendet');
    await user.click(within(row).getByRole('button', { name: 'Erneut senden' }));
    expect(screen.getByRole('status')).toHaveTextContent('eine ausdrückliche Aktion');
    await user.click(screen.getByRole('button', { name: /Geschlossene Historie/ }));
    const replaced = screen.getByRole('article', { name: 'Frida Beispiel · INV-204' });
    const noReference = screen.getByRole('article', { name: 'Jules Beispiel · INV-202' });
    expect(within(noReference).queryByRole('button', { name: /Neuere Einladung ansehen/ })).not.toBeInTheDocument();
    await user.click(within(replaced).getByRole('button', { name: /Neuere Einladung ansehen/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Neuere Einladung: INV-205');
    expect(screen.getByRole('article', { name: 'Frida Beispiel · INV-205' })).toBeVisible();
});

it('offers an explicit assignment action for an existing account without creating another account or sending mail', async () => {
    const user = userEvent.setup();
    render(<InviteTrackingProposal locale="en" onlyStatus="assignmentPending" />);
    const row = screen.getByRole('article', { name: 'Taylor Beispiel · INV-214' });
    expect(within(row).getByRole('button', { name: /Assignment confirmed · Next step/ })).toBeVisible();
    expect(within(row).queryByRole('button', { name: /Account created/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Resend/ })).not.toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: 'Confirm assignment' }));
    expect(screen.getByRole('status')).toHaveTextContent('No new account or email');
});

it('restores focus to the explanation trigger after Escape from the close control', async () => {
    const user = userEvent.setup();
    render(<InviteTrackingProposal initialView="history" />);
    const row = within(screen.getByRole('article', { name: 'Frida Beispiel · INV-204' }));
    const trigger = row.getByRole('button', { name: 'Ersetzt · Erklärung' });
    await user.click(trigger);
    row.getByRole('button', { name: 'Erklärung schließen' }).focus();
    await user.keyboard('{Escape}');
    expect(row.queryByRole('note')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
});
it('retains evidenced account creation in a separate closed fixture and describes invited as sent', async () => {
    const user = userEvent.setup();
    render(<InviteTrackingProposal initialView="history" locale="en" />);
    const created = within(screen.getByRole('article', { name: 'Morgan Beispiel · INV-201' }));
    expect(created.getByRole('button', { name: /Account created · Reached/ })).toBeVisible();
    await user.click(created.getByRole('button', { name: /Invited · Reached/ }));
    expect(created.getByRole('note')).toHaveTextContent('the invitation email was sent');
    expect(created.getByRole('note')).toHaveTextContent('does not prove confirmed delivery');
});
