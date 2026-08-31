import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccountInviteDTO } from '../../../api/accountInvites/accountInvites';
import { InviteProgressBoard } from './InviteProgressBoard';

// Interpolating t-mock (repo pattern) so counts and e-mails land in labels.
const t = (key: string, fallback?: string, options?: Record<string, unknown>) => {
    let text = fallback ?? key;
    Object.entries(options ?? {}).forEach(([name, value]) => {
        text = text.replaceAll(`{{${name}}}`, String(value));
    });
    return text;
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t, i18n: { language: 'de' } }),
}));

const invite = (id: number, overrides: Partial<AccountInviteDTO> = {}): AccountInviteDTO => ({
    id,
    targetRole: 'TENANT_ADMIN',
    tenantId: id,
    recipientEmail: `person${id}@example.org`,
    firstName: null,
    lastName: null,
    agencyId: null,
    departmentId: null,
    provisioningStatus: null,
    inviteStatus: 'EMAIL_SENT',
    emailVerificationStatus: 'PENDING',
    emailDeliveryStatus: 'SENT',
    twoFactorStatus: 'NOT_REQUIRED',
    accessGateStatus: 'BLOCKED_INVITE',
    expiresAt: null,
    acceptedAt: null,
    revokedAt: null,
    supersededAt: null,
    twoFactorWaivedBy: null,
    twoFactorWaivedAt: null,
    twoFactorWaiverReason: null,
    createDate: '2026-08-01T10:00:00Z',
    ...overrides,
});

const INVITES: AccountInviteDTO[] = [
    invite(1),
    invite(2, { inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z' }),
    invite(3, { inviteStatus: 'ACCEPTED', acceptedAt: '2026-08-02T10:00:00Z', accessGateStatus: 'READY' }),
    invite(4, { inviteStatus: 'EXPIRED' }),
];

const baseProps = () => ({
    invites: INVITES,
    loading: false,
    targetRole: 'TENANT_ADMIN' as const,
    selectedIds: [] as number[],
    onSelectionChange: vi.fn(),
    isRowSelectable: (candidate: AccountInviteDTO) =>
        candidate.inviteStatus === 'DRAFT' || candidate.inviteStatus === 'EMAIL_SENT',
    onResend: vi.fn(),
    onCopyLink: vi.fn(),
    onRevoke: vi.fn(),
});

describe('InviteProgressBoard', () => {
    beforeEach(() => vi.clearAllMocks());

    it('renders one summary tile per bucket with derived counts', () => {
        render(<InviteProgressBoard {...baseProps()} />);

        expect(screen.getByRole('button', { name: '1 Eingeladen' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1 In Bearbeitung' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1 Abgeschlossen' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '1 Abgelaufen / Problem' })).toBeInTheDocument();
    });

    it('renders a DRAFT row all-grey with the draft label instead of an active "Eingeladen"', () => {
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={[invite(9, { inviteStatus: 'DRAFT', emailDeliveryStatus: null })]}
            />,
        );

        const row = screen.getByText('person9@example.org').closest('tr') as HTMLElement;
        // The label under the track states the truth: nothing was sent yet.
        expect(within(row).getByText('Entwurf – noch nicht eingeladen')).toBeInTheDocument();
        // Every bead is neutral — no done, no current, and no "Eingeladen" claim.
        expect(within(row).getByText('Eingeladen – ausstehend')).toBeInTheDocument();
        expect(within(row).queryByText(/aktueller Schritt/)).not.toBeInTheDocument();
        expect(within(row).queryByText(/– abgeschlossen/)).not.toBeInTheDocument();
    });

    it('filters the table via a summary tile and clears on the second click', async () => {
        const user = userEvent.setup();
        render(<InviteProgressBoard {...baseProps()} />);

        const problemTile = screen.getByRole('button', { name: '1 Abgelaufen / Problem' });
        await user.click(problemTile);

        const table = within(screen.getByRole('table'));
        expect(table.getByText('person4@example.org')).toBeInTheDocument();
        expect(table.queryByText('person1@example.org')).not.toBeInTheDocument();
        expect(problemTile).toHaveAttribute('aria-pressed', 'true');

        await user.click(problemTile);
        expect(within(screen.getByRole('table')).getByText('person1@example.org')).toBeInTheDocument();
    });

    it('filters by status chip (single-select)', async () => {
        const user = userEvent.setup();
        render(<InviteProgressBoard {...baseProps()} />);

        await user.click(screen.getByRole('checkbox', { name: 'Angenommen' }));

        const table = within(screen.getByRole('table'));
        expect(table.getByText('person2@example.org')).toBeInTheDocument();
        expect(table.queryByText('person1@example.org')).not.toBeInTheDocument();
        // The count in the pagination footer follows the filter.
        expect(screen.getByText('1–2 von 2')).toBeInTheDocument();
    });

    it('shows the phase stepper per row (dead rows carry the error phase)', () => {
        render(<InviteProgressBoard {...baseProps()} />);

        const table = within(screen.getByRole('table'));
        // Fresh EMAIL_SENT tenant row: registration is the current phase.
        expect(table.getAllByText('Registriert – aktueller Schritt').length).toBeGreaterThan(0);
        // Expired row: the blocked phase reads as failed.
        expect(table.getByText('Registriert – fehlgeschlagen')).toBeInTheDocument();
    });

    it('wires resend/copy/revoke and disables ALL THREE actions on terminal rows (C4/C5)', async () => {
        const user = userEvent.setup();
        const props = baseProps();
        render(<InviteProgressBoard {...props} />);

        const liveRow = within(screen.getByText('person1@example.org').closest('tr') as HTMLElement);
        await user.click(liveRow.getByRole('button', { name: 'Erinnerung erneut senden' }));
        expect(props.onResend).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        await user.click(liveRow.getByRole('button', { name: 'Einladungslink kopieren' }));
        expect(props.onCopyLink).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
        await user.click(liveRow.getByRole('button', { name: 'Einladung widerrufen' }));
        expect(props.onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));

        const deadRow = within(screen.getByText('person4@example.org').closest('tr') as HTMLElement);
        expect(deadRow.getByRole('button', { name: 'Erinnerung erneut senden' })).toBeDisabled();
        expect(deadRow.getByRole('button', { name: 'Einladung widerrufen' })).toBeDisabled();
        // Copy used to stay live between two disabled neighbours and answered a
        // press with "link only visible after send" — an enabled control whose
        // only outcome is a refusal. It follows the same rule now.
        expect(deadRow.getByRole('button', { name: 'Einladungslink kopieren' })).toBeDisabled();

        // The state the owner marked: Angenommen — the invite is used up, so
        // there is nothing left to copy either.
        const acceptedRow = within(screen.getByText('person2@example.org').closest('tr') as HTMLElement);
        expect(acceptedRow.getByRole('button', { name: 'Einladungslink kopieren' })).toBeDisabled();
    });

    // C4 asked why disabled actions "render as links". They do not, and this
    // pins that down so a future global cascade cannot quietly make it true:
    // every action is a real disabled <button>, never an anchor, and a disabled
    // one is out of the tab order and has no href to follow.
    it('renders every row action as a button, never an anchor, disabled included (C4)', () => {
        render(<InviteProgressBoard {...baseProps()} />);

        const acceptedRow = within(screen.getByText('person2@example.org').closest('tr') as HTMLElement);
        const actions = [
            acceptedRow.getByRole('button', { name: 'Erinnerung erneut senden' }),
            acceptedRow.getByRole('button', { name: 'Einladungslink kopieren' }),
            acceptedRow.getByRole('button', { name: 'Einladung widerrufen' }),
        ];

        actions.forEach((action) => {
            expect(action.tagName).toBe('BUTTON');
            expect(action).toBeDisabled();
            expect(action).not.toHaveAttribute('href');
        });
        expect((acceptedRow.getByText('Angenommen').closest('td') as HTMLElement).querySelector('a')).toBeNull();
    });

    // C3: "Status ersetzt unklar" — broadened by the owner to every status, in
    // both places it is shown: the filter chip and the row badge.
    it('explains every status on hover, on the filter chip and on the row badge (C3)', async () => {
        const user = userEvent.setup();
        render(<InviteProgressBoard {...baseProps()} invites={[invite(9, { inviteStatus: 'SUPERSEDED' })]} />);

        await user.hover(screen.getByRole('checkbox', { name: 'Ersetzt' }));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung.',
        );
        await user.unhover(screen.getByRole('checkbox', { name: 'Ersetzt' }));

        const badge = within(screen.getByRole('table')).getByText('Ersetzt');
        await user.hover(badge);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung.',
        );
        // Reachable without a mouse, too.
        expect(badge).toHaveAttribute('tabindex', '0');
    });

    it('gives each of the six statuses its own explanation, not just Ersetzt (C3)', () => {
        render(<InviteProgressBoard {...baseProps()} />);

        // One chip per status, each carrying a distinct explanation.
        const hints = ['Draft', 'Gesendet', 'Angenommen', 'Abgelaufen', 'Widerrufen', 'Ersetzt'].map(
            (label) => screen.getByRole('checkbox', { name: label }).closest('span')?.textContent,
        );
        expect(new Set(hints).size).toBe(6);
    });

    it('reports selection changes through row checkboxes', async () => {
        const user = userEvent.setup();
        const props = baseProps();
        render(<InviteProgressBoard {...props} />);

        await user.click(screen.getByRole('checkbox', { name: 'Einladung für person1@example.org auswählen' }));
        expect(props.onSelectionChange).toHaveBeenCalledWith([1]);

        // Terminal rows keep their checkbox visible but disabled.
        expect(screen.getByRole('checkbox', { name: 'Einladung für person4@example.org auswählen' })).toBeDisabled();
    });

    /*
     * The bulk actions above the board act on the SELECTION, not on what is on
     * screen. A row hidden by a filter must therefore not stay checked — it
     * would be resent or revoked without the admin ever seeing it.
     */
    describe('selection across a filter change', () => {
        /** The board is controlled; the harness holds the selection like the tab does. */
        const ControlledBoard = ({ onSelectionChange, ...rest }: ReturnType<typeof baseProps>) => {
            const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
            return (
                <InviteProgressBoard
                    {...rest}
                    selectedIds={selectedIds}
                    onSelectionChange={(ids) => {
                        onSelectionChange(ids);
                        setSelectedIds(ids);
                    }}
                />
            );
        };

        it('prunes ids the new filter hides', async () => {
            const user = userEvent.setup();
            const props = baseProps();
            render(<ControlledBoard {...props} />);

            const rowCheckbox = 'Einladung für person1@example.org auswählen';
            await user.click(screen.getByRole('checkbox', { name: rowCheckbox }));
            expect(props.onSelectionChange).toHaveBeenLastCalledWith([1]);

            // person1 is EMAIL_SENT, so the "Angenommen" chip hides it.
            await user.click(screen.getByRole('checkbox', { name: 'Angenommen' }));
            expect(props.onSelectionChange).toHaveBeenLastCalledWith([]);

            // Really deselected, not just reported: it comes back unchecked.
            await user.click(screen.getByRole('checkbox', { name: 'Angenommen' }));
            expect(screen.getByRole('checkbox', { name: rowCheckbox })).not.toBeChecked();
        });

        it('keeps ids the new filter still shows', async () => {
            const user = userEvent.setup();
            const props = baseProps();
            render(<ControlledBoard {...props} />);

            const rowCheckbox = 'Einladung für person1@example.org auswählen';
            await user.click(screen.getByRole('checkbox', { name: rowCheckbox }));
            props.onSelectionChange.mockClear();

            // The "Eingeladen" bucket contains person1 — nothing to prune.
            await user.click(screen.getByRole('button', { name: '1 Eingeladen' }));
            expect(props.onSelectionChange).not.toHaveBeenCalled();
            expect(screen.getByRole('checkbox', { name: rowCheckbox })).toBeChecked();
        });
    });

    it('shows the friendly empty state with the invite CTA when nothing exists', async () => {
        const user = userEvent.setup();
        const props = { ...baseProps(), invites: [], onInviteCta: vi.fn() };
        render(<InviteProgressBoard {...props} />);

        expect(screen.getByText('Noch keine Einladungen')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Erste Einladung senden' }));
        expect(props.onInviteCta).toHaveBeenCalledTimes(1);
    });

    it('shows the filtered empty state without the CTA', async () => {
        const user = userEvent.setup();
        render(<InviteProgressBoard {...baseProps()} invites={[invite(1)]} onInviteCta={vi.fn()} />);

        await user.click(screen.getByRole('checkbox', { name: 'Angenommen' }));
        expect(screen.getByText('Keine Einladungen für diesen Filter.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Erste Einladung senden' })).not.toBeInTheDocument();
    });

    it('paginates client-side', async () => {
        const user = userEvent.setup();
        const many = Array.from({ length: 25 }, (_, index) => invite(index + 1));
        render(<InviteProgressBoard {...baseProps()} invites={many} />);

        expect(screen.getByText('1–20 von 25')).toBeInTheDocument();
        expect(screen.queryByText('person25@example.org')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
        expect(screen.getByText('21–25 von 25')).toBeInTheDocument();
        expect(screen.getByText('person25@example.org')).toBeInTheDocument();
    });

    it('does not snap back to a stale page when the list shrinks and grows again', async () => {
        const user = userEvent.setup();
        const many = Array.from({ length: 25 }, (_, index) => invite(index + 1));
        const { rerender } = render(<InviteProgressBoard {...baseProps()} invites={many} />);

        await user.click(screen.getByRole('button', { name: 'Nächste Seite' }));
        expect(screen.getByText('21–25 von 25')).toBeInTheDocument();

        // A bulk revoke plus the refetch leaves a single page.
        rerender(<InviteProgressBoard {...baseProps()} invites={many.slice(0, 3)} />);
        expect(screen.getByText('1–3 von 3')).toBeInTheDocument();

        // Growing again must not resurrect page 2 behind the admin's back:
        // clamping only the rendered page would leave the state at 2.
        rerender(<InviteProgressBoard {...baseProps()} invites={many} />);
        expect(screen.getByText('1–20 von 25')).toBeInTheDocument();
    });

    it('sorts "Empfänger" by the displayed name, not by the e-mail behind it', async () => {
        const user = userEvent.setup();
        // Name order and e-mail order disagree on purpose: sorting on the e-mail
        // would render Anders → Zeller → Meier and read as unsorted.
        const named = [
            invite(1, { firstName: 'Rita', lastName: 'Meier', recipientEmail: 'aaa@example.org' }),
            invite(2, { firstName: 'Bea', lastName: 'Zeller', recipientEmail: 'mmm@example.org' }),
            invite(3, { firstName: 'Nils', lastName: 'Anders', recipientEmail: 'zzz@example.org' }),
        ];
        render(<InviteProgressBoard {...baseProps()} invites={named} />);

        await user.click(screen.getByRole('button', { name: /Empfänger/ }));

        const names = screen
            .getAllByRole('row')
            .slice(1)
            .map((row) => within(row).getByText(/Meier|Zeller|Anders/).textContent);
        expect(names).toEqual(['Bea Zeller', 'Nils Anders', 'Rita Meier']);
    });
});
