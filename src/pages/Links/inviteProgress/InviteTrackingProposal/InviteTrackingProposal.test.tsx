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
        expect(within(row).getAllByText('30.09., 22:12')).toHaveLength(2);
        expect(within(row).getByRole('button', { name: /Konto angelegt · Erreicht/ })).toBeVisible();
        expect(within(row).queryByRole('button', { name: /Konto angelegt · Fehlgeschlagen/ })).not.toBeInTheDocument();
        await user.keyboard('{Escape}');
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
