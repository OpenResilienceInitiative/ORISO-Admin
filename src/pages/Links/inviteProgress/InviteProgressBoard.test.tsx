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

// What the server sends for each status (ORISO-UserService#1260); a finished onboarding overrides it with DONE.
const SERVER_PHASE: Record<AccountInviteDTO['inviteStatus'], NonNullable<AccountInviteDTO['progressPhase']>> = {
    WAITING_FOR_UNIT: 'PREPARED',
    DRAFT: 'PREPARED',
    EMAIL_SENT: 'INVITED',
    ACCEPTED: 'ACCOUNT_CREATED',
    EXPIRED: 'NEEDS_ACTION',
    REVOKED: 'CLOSED',
    SUPERSEDED: 'CLOSED',
};

const invite = (id: number, overrides: Partial<AccountInviteDTO> = {}): AccountInviteDTO => ({
    progressPhase: SERVER_PHASE[overrides.inviteStatus ?? 'EMAIL_SENT'],
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
    invite(3, {
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-02T10:00:00Z',
        accessGateStatus: 'READY',
        dpaSignedAt: '2026-08-04T10:00:00Z',
        progressPhase: 'DONE',
    }),
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

    it('renders the five phase tiles with their counts and a breakdown by raw status', () => {
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={[
                    ...INVITES,
                    invite(5, { inviteStatus: 'DRAFT', emailDeliveryStatus: null }),
                    invite(6, { inviteStatus: 'REVOKED' }),
                ]}
            />,
        );

        const tiles = within(screen.getByRole('group', { name: 'Onboarding-Übersicht' })).getAllByRole('button');
        expect(tiles.map((tile) => tile.textContent)).toEqual([
            '1Vorbereitet1 Draft',
            '1Eingeladen1 Gesendet',
            '1Konto angelegt1 Angenommen',
            '1Fertig1 Angenommen',
            '2Braucht Aktion1 Abgelaufen · 1 Widerrufen',
        ]);
        // The tiles are the only filter: the status chip row is gone.
        expect(screen.queryByRole('checkbox', { name: 'Angenommen' })).not.toBeInTheDocument();
    });

    it("counts the tiles from the server's tab totals, not from the rows it holds", () => {
        render(
            <InviteProgressBoard
                {...baseProps()}
                tileCounts={{
                    prepared: { total: 24, details: { DRAFT: 24 } },
                    invited: { total: 0, details: {} },
                    accountCreated: { total: 0, details: {} },
                    done: { total: 0, details: {} },
                    needsAction: { total: 3, details: { EXPIRED: 1, REVOKED: 1, SUPERSEDED: 1 } },
                }}
            />,
        );

        const tiles = within(screen.getByRole('group', { name: 'Onboarding-Übersicht' })).getAllByRole('button');
        expect(tiles[0]).toHaveTextContent('24Vorbereitet24 Draft');
        expect(tiles[4]).toHaveTextContent('3Braucht Aktion1 Abgelaufen · 1 Widerrufen · 1 Ersetzt');
    });

    it('says "keine" on an empty tile instead of an empty breakdown', () => {
        render(<InviteProgressBoard {...baseProps()} />);
        expect(screen.getByRole('button', { name: '0 Vorbereitet keine' })).toBeInTheDocument();
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

        const problemTile = screen.getByRole('button', { name: /^1 Braucht Aktion/ });
        await user.click(problemTile);

        const table = within(screen.getByRole('table'));
        expect(table.getByText('person4@example.org')).toBeInTheDocument();
        expect(table.queryByText('person1@example.org')).not.toBeInTheDocument();
        expect(problemTile).toHaveAttribute('aria-pressed', 'true');

        await user.click(problemTile);
        expect(within(screen.getByRole('table')).getByText('person1@example.org')).toBeInTheDocument();
    });

    it('filters by one tile at a time; another tile replaces the filter', async () => {
        const user = userEvent.setup();
        render(<InviteProgressBoard {...baseProps()} />);

        await user.click(screen.getByRole('button', { name: /^1 Konto angelegt/ }));
        const table = within(screen.getByRole('table'));
        expect(table.getByText('person2@example.org')).toBeInTheDocument();
        expect(table.queryByText('person3@example.org')).not.toBeInTheDocument();
        // The count in the pagination footer follows the filter.
        expect(screen.getByText('1–1 von 1')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^1 Fertig/ }));
        expect(within(screen.getByRole('table')).getByText('person3@example.org')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^1 Konto angelegt/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows the phase stepper per row (dead rows carry the error phase)', () => {
        render(<InviteProgressBoard {...baseProps()} />);

        const table = within(screen.getByRole('table'));
        // Fresh EMAIL_SENT tenant row: registration is AWAITED, not reached —
        // the label must not claim "Registriert" right after the mail went out.
        expect(table.getAllByText('Wartet auf Registrierung – aktueller Schritt').length).toBeGreaterThan(0);
        // Expired row: the blocked phase reads as failed (plain label).
        expect(table.getByText('Registriert – fehlgeschlagen')).toBeInTheDocument();
    });

    it('shows a forwarded, unsigned DPA as waiting on the signature — never as complete (owner scenario)', () => {
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={[
                    invite(7, {
                        inviteStatus: 'ACCEPTED',
                        acceptedAt: '2026-08-02T10:00:00Z',
                        accessGateStatus: 'READY',
                        dpaForwardedAt: '2026-08-03T10:00:00Z',
                    }),
                ]}
            />,
        );

        const row = within(screen.getByText('person7@example.org').closest('tr') as HTMLElement);
        // The signature is the awaited step.
        expect(row.getByText(/^Wartet auf Vertragsunterschrift – aktueller Schritt/)).toBeInTheDocument();
        // The forwarded bead is done, dated, and announced as such.
        expect(row.getByText(/^Vertragsunterlagen weitergeleitet – abgeschlossen, 03\.08\.2026/)).toBeInTheDocument();
        // The track must NOT claim completion anywhere in this row.
        expect(row.queryByText(/^Fertig – abgeschlossen/)).not.toBeInTheDocument();
        expect(row.queryByText(/^Vertrag unterschrieben – abgeschlossen/)).not.toBeInTheDocument();
    });

    it('completes the track only once the signature landed', () => {
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={[
                    invite(8, {
                        inviteStatus: 'ACCEPTED',
                        acceptedAt: '2026-08-02T10:00:00Z',
                        accessGateStatus: 'READY',
                        dpaForwardedAt: '2026-08-03T10:00:00Z',
                        dpaSignedAt: '2026-08-04T10:00:00Z',
                    }),
                ]}
            />,
        );

        const row = within(screen.getByText('person8@example.org').closest('tr') as HTMLElement);
        expect(row.getByText(/^Vertrag unterschrieben – abgeschlossen, 04\.08\.2026/)).toBeInTheDocument();
        expect(row.getByText(/^Fertig – abgeschlossen/)).toBeInTheDocument();
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

    // C3: "Status ersetzt unklar" — broadened by the owner to every status; the row badge explains it.
    it('explains every status on hover on the row badge (C3)', async () => {
        const user = userEvent.setup();
        render(<InviteProgressBoard {...baseProps()} invites={[invite(9, { inviteStatus: 'SUPERSEDED' })]} />);

        const badge = within(screen.getByRole('table')).getByText('Ersetzt');
        await user.hover(badge);
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Diese Einladung wurde durch ein erneutes Versenden ersetzt — es gilt die neuere Einladung.',
        );
        // Reachable without a mouse, too.
        expect(badge).toHaveAttribute('tabindex', '0');
    });

    it('gives each of the six statuses its own explanation, not just Ersetzt (C3)', async () => {
        const user = userEvent.setup();
        const statuses = ['DRAFT', 'EMAIL_SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'SUPERSEDED'] as const;
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={statuses.map((inviteStatus, index) => invite(20 + index, { inviteStatus }))}
            />,
        );

        const labels = ['Draft', 'Gesendet', 'Angenommen', 'Abgelaufen', 'Widerrufen', 'Ersetzt'];
        // One tooltip at a time: hover, read, leave.
        const hints = await labels.reduce<Promise<string[]>>(async (previous, label) => {
            const collected = await previous;
            const badge = within(screen.getByRole('table')).getByText(label);
            await user.hover(badge);
            const hint = (await screen.findByRole('tooltip')).textContent ?? '';
            await user.unhover(badge);
            return [...collected, hint];
        }, Promise.resolve([]));
        expect(new Set(hints).size).toBe(6);
    });

    it('marks a sent invite without a delivery receipt as unconfirmed and recoverable', async () => {
        const user = userEvent.setup();
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={[invite(10, { inviteStatus: 'EMAIL_SENT', emailDeliveryStatus: null })]}
            />,
        );

        const row = within(screen.getByText('person10@example.org').closest('tr') as HTMLElement);
        // The badge itself says it: a hover-only hint left "Gesendet" on screen.
        await user.hover(row.getByText('Versand unbestätigt'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Der Versand konnte nicht bestätigt werden. Die Einladung bleibt erhalten und kann erneut gesendet werden.',
        );
        expect(row.getByRole('button', { name: 'Erinnerung erneut senden' })).toBeEnabled();
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

            // person1 is EMAIL_SENT, so the "Konto angelegt" tile hides it.
            await user.click(screen.getByRole('button', { name: /^1 Konto angelegt/ }));
            expect(props.onSelectionChange).toHaveBeenLastCalledWith([]);

            // Really deselected, not just reported: it comes back unchecked.
            await user.click(screen.getByRole('button', { name: /^1 Konto angelegt/ }));
            expect(screen.getByRole('checkbox', { name: rowCheckbox })).not.toBeChecked();
        });

        it('keeps ids the new filter still shows', async () => {
            const user = userEvent.setup();
            const props = baseProps();
            render(<ControlledBoard {...props} />);

            const rowCheckbox = 'Einladung für person1@example.org auswählen';
            await user.click(screen.getByRole('checkbox', { name: rowCheckbox }));
            props.onSelectionChange.mockClear();

            // The "Eingeladen" tile contains person1 — nothing to prune.
            await user.click(screen.getByRole('button', { name: /^1 Eingeladen/ }));
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

        await user.click(screen.getByRole('button', { name: /^0 Konto angelegt/ }));
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

describe('InviteProgressBoard — queue and topic permission', () => {
    beforeEach(() => vi.clearAllMocks());

    const waiting = invite(10, {
        targetRole: 'COUNSELLOR',
        inviteStatus: 'WAITING_FOR_UNIT',
        waitingForUnit: 'AGENCY',
        emailDeliveryStatus: null,
        topicPermission: 'NONE',
    });
    const orphan = invite(11, {
        targetRole: 'COUNSELLOR',
        inviteStatus: 'WAITING_FOR_UNIT',
        waitingForUnit: 'AGENCY',
        queueProblem: 'NO_UNIT_ADMIN',
        emailDeliveryStatus: null,
        progressPhase: 'NEEDS_ACTION',
    });
    const accepted = invite(12, {
        targetRole: 'COUNSELLOR',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-02T10:00:00Z',
        topicPermission: 'SELECT_EXISTING',
    });
    const counsellorProps = (invites: AccountInviteDTO[], extra = {}) => ({
        ...baseProps(),
        invites,
        targetRole: 'COUNSELLOR' as const,
        ...extra,
    });

    it('shows a waiting invite with the new first step, resend disabled but revoke possible', () => {
        render(<InviteProgressBoard {...counsellorProps([waiting])} />);

        const row = screen.getByText('person10@example.org').closest('tr') as HTMLElement;
        expect(within(row).getByText('Beratungsstelle noch nicht angelegt')).toBeInTheDocument();
        expect(within(row).getByText('Wartet')).toBeInTheDocument();
        expect(within(row).getByRole('button', { name: 'Erinnerung erneut senden' })).toBeDisabled();
        expect(within(row).getByRole('button', { name: 'Einladungslink kopieren' })).toBeDisabled();
        expect(within(row).getByRole('button', { name: 'Einladung widerrufen' })).toBeEnabled();
        expect(within(row).queryByTestId('queue-problem-badge')).toBeNull();
    });

    it('marks a waiting invite without unit admin with the "Keine BST-Admin" badge', () => {
        render(<InviteProgressBoard {...counsellorProps([orphan])} />);

        expect(screen.getByTestId('queue-problem-badge')).toHaveTextContent('Keine BST-Admin');
        expect(screen.getByRole('button', { name: '1 Braucht Aktion 1 Keine BST-Admin' })).toBeInTheDocument();
    });

    it('names the missing Träger admin in the badge of an invite that waits for a new Träger', async () => {
        const tenantOrphan = invite(13, {
            targetRole: 'AGENCY_ADMIN',
            inviteStatus: 'WAITING_FOR_UNIT',
            waitingForUnit: 'TENANT',
            queueProblem: 'NO_UNIT_ADMIN',
            emailDeliveryStatus: null,
            progressPhase: 'NEEDS_ACTION',
        });
        render(<InviteProgressBoard {...counsellorProps([tenantOrphan])} />);

        const badge = screen.getByTestId('queue-problem-badge');
        expect(badge).toHaveTextContent('Keine Träger-Admin');
        await userEvent.hover(badge);
        expect(await screen.findByText(/Laden Sie eine Träger-Admin mit derselben Nummer ein/)).toBeInTheDocument();
    });

    it('names the queue problem for screen readers instead of calling it a delivery problem', () => {
        render(<InviteProgressBoard {...counsellorProps([orphan])} />);

        const row = screen.getByText('person11@example.org').closest('tr') as HTMLElement;
        const progress = within(row).getByRole('list', { name: 'Onboarding-Fortschritt' });
        expect(progress).not.toHaveTextContent('Zustellproblem');
        expect(progress).toHaveTextContent('Keine BST-Admin – Einladung wartet');
    });

    const topicChip = () => screen.getByRole('button', { name: /Themen für/ });

    it('changes the topic permission of an accepted counsellor from the chip menu', async () => {
        const onTopicPermissionChange = vi.fn();
        render(<InviteProgressBoard {...counsellorProps([accepted], { onTopicPermissionChange })} />);

        await userEvent.click(topicChip());
        const menu = await screen.findByRole('menu');
        await userEvent.click(within(menu).getByText('Darf weitere Themen anlegen'));

        expect(onTopicPermissionChange).toHaveBeenCalledWith(accepted, 'CREATE');
    });

    it('does not save when the current level is picked again', async () => {
        const onTopicPermissionChange = vi.fn();
        render(<InviteProgressBoard {...counsellorProps([accepted], { onTopicPermissionChange })} />);

        await userEvent.click(topicChip());
        await userEvent.click(within(await screen.findByRole('menu')).getByText('Darf weitere Fachbereiche auswählen'));

        expect(onTopicPermissionChange).not.toHaveBeenCalled();
    });

    it('shows the short topic label in the chip, the full title and description in a tooltip', async () => {
        render(
            <InviteProgressBoard
                {...counsellorProps([{ ...accepted, topicPermission: 'NONE' }], { onTopicPermissionChange: vi.fn() })}
            />,
        );

        expect(topicChip()).toHaveTextContent(/^Themen: Keine weiteren$/);
        await userEvent.hover(topicChip());
        const tooltip = await screen.findByRole('tooltip');
        expect(tooltip).toHaveTextContent('Keine weiteren Fachbereiche');
        expect(tooltip).toHaveTextContent('Nur die vorausgewählten Fachbereiche.');
    });

    it.each([
        ['SELECT_EXISTING', 'Auswählen'],
        ['CREATE', 'Anlegen'],
    ] as const)('labels %s as "Themen: %s" in the chip', (topicPermission, short) => {
        render(
            <InviteProgressBoard
                {...counsellorProps([{ ...accepted, topicPermission }], { onTopicPermissionChange: vi.fn() })}
            />,
        );

        expect(topicChip()).toHaveTextContent(new RegExp(`^Themen: ${short}$`));
    });

    it('lists every level with its title and description, the current one checked', async () => {
        render(<InviteProgressBoard {...counsellorProps([accepted], { onTopicPermissionChange: vi.fn() })} />);

        await userEvent.click(topicChip());
        const items = within(await screen.findByRole('menu')).getAllByRole('menuitem');
        expect(items).toHaveLength(3);
        const current = items.find((item) => item.textContent?.includes('Darf weitere Fachbereiche auswählen'));
        expect(current).toHaveTextContent('Wählt selbst aus den vorhandenen Fachbereichen der Beratungsstelle.');
        expect(current?.querySelector('svg')).not.toBeNull();
        expect(items.filter((item) => item.querySelector('svg'))).toHaveLength(1);
    });

    it('keeps the chip visible but disabled, with the reason, when the viewer may not change it', async () => {
        render(<InviteProgressBoard {...counsellorProps([accepted])} />);

        expect(topicChip()).toHaveAttribute('aria-disabled', 'true');
        await userEvent.click(topicChip());
        expect(screen.queryByRole('menu')).toBeNull();
        await userEvent.hover(topicChip());
        expect(await screen.findByRole('tooltip')).toHaveTextContent('keine Berechtigung');
    });

    it('disables the chip while its row is saving', () => {
        render(
            <InviteProgressBoard
                {...counsellorProps([accepted], { onTopicPermissionChange: vi.fn(), topicPermissionSavingIds: [12] })}
            />,
        );

        expect(topicChip()).toHaveAttribute('aria-disabled', 'true');
    });

    it('offers no topic column without a change handler and on the Träger tab', () => {
        render(<InviteProgressBoard {...baseProps()} onTopicPermissionChange={vi.fn()} />);

        expect(screen.queryByRole('columnheader', { name: 'Themen & Fachbereiche' })).toBeNull();
    });
});

describe('InviteProgressBoard — role chip', () => {
    beforeEach(() => vi.clearAllMocks());

    const open = invite(30, { targetRole: 'COUNSELLOR', firstName: 'Lena', lastName: 'Vogt' });
    const accepted = invite(31, {
        targetRole: 'COUNSELLOR',
        firstName: 'Anke',
        lastName: 'Roth',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-08-02T10:00:00Z',
        provisionedUserId: 'c-31',
    });
    const counsellorProps = (invites: AccountInviteDTO[], extra = {}) => ({
        ...baseProps(),
        invites,
        targetRole: 'COUNSELLOR' as const,
        viewerScope: 'tenant' as const,
        ...extra,
    });
    const roleChip = (name: string) => screen.getByRole('button', { name: new RegExp(`^Rolle von ${name}`) });

    it('changes the role of an invite that is not accepted yet', async () => {
        const onRoleChange = vi.fn();
        render(<InviteProgressBoard {...counsellorProps([open], { onRoleChange, onRoleAdd: vi.fn() })} />);

        expect(roleChip('Lena Vogt')).toHaveTextContent(/^Berater:in$/);
        await userEvent.click(roleChip('Lena Vogt'));
        const menu = await screen.findByRole('menu');
        expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
        await userEvent.click(within(menu).getByText('BST-Admin'));

        expect(onRoleChange).toHaveBeenCalledWith(open, 'AGENCY_ADMIN');
    });

    it('explains on hover what the role means and what can be changed', async () => {
        render(<InviteProgressBoard {...counsellorProps([open], { onRoleChange: vi.fn() })} />);

        await userEvent.hover(roleChip('Lena Vogt'));
        const tooltip = await screen.findByRole('tooltip');
        expect(tooltip).toHaveTextContent('Berät Ratsuchende in ihrer Beratungsstelle.');
        expect(tooltip).toHaveTextContent('Noch nicht angenommen: Die Rolle lässt sich hier ändern.');
    });

    it('only adds "auch BST-Admin" once the account exists, and points removal to the users area', async () => {
        const onRoleAdd = vi.fn();
        const onRoleChange = vi.fn();
        render(<InviteProgressBoard {...counsellorProps([accepted], { onRoleAdd, onRoleChange })} />);

        await userEvent.click(roleChip('Anke Roth'));
        const menu = await screen.findByRole('menu');
        const change = within(menu).getByText('BST-Admin').closest('li') as HTMLElement;
        expect(change).toHaveAttribute('aria-disabled', 'true');
        expect(change).toHaveTextContent('Das Konto besteht: im Bereich Benutzer ändern.');
        expect(within(menu).getByRole('link', { name: 'Rolle entfernen: im Bereich Benutzer' })).toHaveAttribute(
            'href',
            '/admin/users/consultants',
        );

        await userEvent.click(within(menu).getByText('+ auch BST-Admin'));
        expect(onRoleAdd).toHaveBeenCalledWith(accepted, 'AGENCY_ADMIN');
        expect(onRoleChange).not.toHaveBeenCalled();
    });

    it('shows a role the viewer may not hand out, disabled with the reason', async () => {
        render(<InviteProgressBoard {...counsellorProps([open], { viewerScope: 'agency', onRoleChange: vi.fn() })} />);

        // Nothing is left to pick for an agency admin: the chip stays visible, locked, with the reason.
        expect(roleChip('Lena Vogt')).toHaveAttribute('aria-disabled', 'true');
        await userEvent.hover(roleChip('Lena Vogt'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent('keine Berechtigung');
    });

    it('names both roles once "auch BST-Admin" was added, and offers it no more', async () => {
        render(
            <InviteProgressBoard
                {...counsellorProps([{ ...accepted, accountRoles: ['COUNSELLOR', 'AGENCY_ADMIN'] }], {
                    onRoleAdd: vi.fn(),
                })}
            />,
        );

        expect(roleChip('Anke Roth')).toHaveTextContent(/^Berater:in \+ BST-Admin$/);
        expect(roleChip('Anke Roth')).toHaveAttribute('aria-disabled', 'true');
    });

    it.each([
        ['has the role already', { accountRoles: ['COUNSELLOR', 'AGENCY_ADMIN'] }, 'Das Konto hat diese Rolle schon.'],
        ['is still being created', { provisionedUserId: null }, 'Das Konto wird noch angelegt.'],
    ])(
        'says why a locked chip is locked when the account %s, not that permission is missing',
        async (_, patch, why) => {
            render(
                <InviteProgressBoard
                    {...counsellorProps([{ ...accepted, ...patch } as AccountInviteDTO], {
                        onRoleAdd: vi.fn(),
                        onRoleChange: vi.fn(),
                    })}
                />,
            );

            expect(roleChip('Anke Roth')).toHaveAttribute('aria-disabled', 'true');
            await userEvent.hover(roleChip('Anke Roth'));
            const tooltip = await screen.findByRole('tooltip');
            expect(tooltip).toHaveTextContent(why);
            expect(tooltip).not.toHaveTextContent('keine Berechtigung');
        },
    );

    it('explains that a Träger-Admin needs a new invite instead of a role change', async () => {
        render(<InviteProgressBoard {...counsellorProps([open], { onRoleChange: vi.fn() })} />);

        await userEvent.click(roleChip('Lena Vogt'));
        const tenantAdmin = within(await screen.findByRole('menu'))
            .getByText('Träger-Admin')
            .closest('li') as HTMLElement;
        expect(tenantAdmin).toHaveAttribute('aria-disabled', 'true');
        expect(tenantAdmin).toHaveTextContent('widerrufen und neu einladen');
    });

    it('keeps the chip visible but locked without a change handler', () => {
        render(<InviteProgressBoard {...counsellorProps([open])} />);
        expect(roleChip('Lena Vogt')).toHaveAttribute('aria-disabled', 'true');
    });

    it('disables the chip while its row is saving', () => {
        render(<InviteProgressBoard {...counsellorProps([open], { onRoleChange: vi.fn(), roleSavingIds: [30] })} />);
        expect(roleChip('Lena Vogt')).toHaveAttribute('aria-disabled', 'true');
    });
});

describe('InviteProgressBoard — dated tracker', () => {
    const released = invite(40, {
        targetRole: 'COUNSELLOR',
        unitCreatedAt: '2026-09-24T09:00:00Z',
        sentAt: '2026-09-24T09:01:00Z',
        accountCreatedAt: '2026-09-25T12:30:12Z',
        inviteStatus: 'ACCEPTED',
        acceptedAt: '2026-09-25T12:30:12Z',
    });
    const counsellorBoard = (invites: AccountInviteDTO[]) => (
        <InviteProgressBoard {...baseProps()} targetRole="COUNSELLOR" invites={invites} />
    );

    it('shows four steps with a date under each reached one when the invite waited for a new unit', () => {
        render(counsellorBoard([released]));

        const row = within(screen.getByText('person40@example.org').closest('tr') as HTMLElement);
        const steps = within(row.getByRole('list', { name: 'Onboarding-Fortschritt' })).getAllByRole('listitem');
        expect(steps).toHaveLength(4);
        expect(steps.map((step) => step.textContent)).toEqual([
            expect.stringMatching(/^Beratungsstelle angelegt – abgeschlossen, 24\.09\.2026, .*24\.09\., \d\d:\d\d$/),
            expect.stringMatching(/^Eingeladen – abgeschlossen, 24\.09\.2026, .*24\.09\., \d\d:\d\d$/),
            expect.stringMatching(/^Konto angelegt – abgeschlossen, 25\.09\.2026, .*25\.09\., \d\d:\d\d$/),
            'Wartet auf Abschluss – aktueller Schritt',
        ]);
    });

    it('dates every reached step on the Träger tab too', () => {
        render(
            <InviteProgressBoard
                {...baseProps()}
                invites={[
                    invite(42, {
                        tenantIdAllocationMode: 'MANUAL',
                        sentAt: '2026-09-24T09:01:00Z',
                        inviteStatus: 'ACCEPTED',
                        acceptedAt: '2026-09-25T12:30:12Z',
                        accountCreatedAt: '2026-09-25T12:30:12Z',
                        unitCreatedAt: '2026-09-25T12:30:12Z',
                        twoFactorStatus: 'ACTIVE',
                        twoFactorDoneAt: '2026-09-25T12:40:00Z',
                    }),
                ]}
            />,
        );

        const row = within(screen.getByText('person42@example.org').closest('tr') as HTMLElement);
        const steps = within(row.getByRole('list', { name: 'Onboarding-Fortschritt' })).getAllByRole('listitem');
        expect(steps.map((step) => step.textContent)).toEqual([
            expect.stringMatching(/^Eingeladen – abgeschlossen, 24\.09\.2026, .*24\.09\., \d\d:\d\d$/),
            expect.stringMatching(/^Registriert – abgeschlossen, 25\.09\.2026, .*25\.09\., \d\d:\d\d$/),
            expect.stringMatching(/^Träger angelegt – abgeschlossen, 25\.09\.2026, .*25\.09\., \d\d:\d\d$/),
            expect.stringMatching(/^2FA aktiv – abgeschlossen, 25\.09\.2026, .*25\.09\., \d\d:\d\d$/),
            expect.stringMatching(/^Wartet auf Vertragsunterschrift – aktueller Schritt$/),
            expect.stringMatching(/^Fertig – ausstehend$/),
        ]);
    });

    it('shows three steps when the invite never waited', () => {
        render(counsellorBoard([invite(41, { targetRole: 'COUNSELLOR', sentAt: '2026-09-24T09:01:00Z' })]));

        const row = within(screen.getByText('person41@example.org').closest('tr') as HTMLElement);
        expect(within(row.getByRole('list', { name: 'Onboarding-Fortschritt' })).getAllByRole('listitem')).toHaveLength(
            3,
        );
    });
});
