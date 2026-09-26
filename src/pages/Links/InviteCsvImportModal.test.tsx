// antd's static message API is a silent no-op under React 19 without this patch.
import '@ant-design/v5-patch-for-react-19';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { message } from 'antd';
import userEvent from '@testing-library/user-event';
import { InviteCsvImportModal } from './InviteCsvImportModal';
import type { ParseInviteCsvResult } from './csv/parseInviteCsv';

// antd's Modal/Tooltip/Table query matchMedia, which jsdom does not implement.
window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
})) as typeof window.matchMedia;

// Interpolating t-mock so counts/lines land in the asserted strings.
const t = (key: string, fallback?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
    let text = typeof fallback === 'string' ? fallback : key;
    const values = typeof fallback === 'object' ? fallback : options;
    Object.entries(values ?? {}).forEach(([name, value]) => {
        text = text.replaceAll(`{{${name}}}`, String(value));
    });
    return text;
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

const parseResultOf = (partial: Partial<ParseInviteCsvResult>): ParseInviteCsvResult => ({
    rows: [],
    rejected: [],
    delimiter: ',',
    headerSkipped: false,
    ...partial,
});

const rowCells = (email: string) => within(screen.getByText(email).closest('tr') as HTMLElement);

describe('InviteCsvImportModal', () => {
    const createInvite = vi.fn();
    const onClose = vi.fn();
    const onCreated = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        createInvite.mockResolvedValue(undefined);
    });

    afterEach(async () => {
        // The import summary uses antd's static message API: an own React root with an
        // auto-dismiss timer. Tear it down and drain the scheduler's pending ticks here,
        // or the timer fires after this file's jsdom is gone and react-dom crashes with
        // "window is not defined" (unhandled error -> vitest exit 1; CI runs 29667445994,
        // 29694138250). React's scheduler can chain several follow-up ticks depending on
        // how much work was in flight, so drain generously rather than a fixed small count.
        message.destroy();
        for (let i = 0; i < 20; i += 1) {
            // eslint-disable-next-line no-await-in-loop -- sequential drain, not parallelizable
            await new Promise((resolve) => {
                setImmediate(resolve);
            });
        }
    });

    const renderModal = (parseResult: ParseInviteCsvResult, props: Record<string, unknown> = {}) =>
        render(
            <InviteCsvImportModal
                createInvite={createInvite}
                idKind="tenant"
                parseResult={parseResult}
                takenTenantIds={new Set([1, 2, 4])}
                onClose={onClose}
                onCreated={onCreated}
                // eslint-disable-next-line react/jsx-props-no-spreading
                {...props}
            />,
        );

    it('auto-populates empty Träger-IDs with consecutive free ids, skipping taken and batch ids', async () => {
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false },
                    {
                        line: 2,
                        email: 'b@example.org',
                        firstName: 'B',
                        lastName: 'Two',
                        id: 5,
                        missingName: false,
                    },
                    { line: 3, email: 'c@example.org', firstName: 'C', lastName: 'Three', missingName: false },
                ],
            }),
        );

        // Taken: 1, 2, 4. Explicit: 5. Autos: 3 (row 1) and 6 (row 3, skipping 4 + 5).
        expect(rowCells('a@example.org').getByText('3')).toBeInTheDocument();
        expect(rowCells('b@example.org').getByText('5')).toBeInTheDocument();
        expect(rowCells('c@example.org').getByText('6')).toBeInTheDocument();

        // The batch ids flow into the sequential createAccountInvite calls.
        await userEvent.click(screen.getByRole('button', { name: '3 Empfänger anlegen' }));
        await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(3));
        expect(createInvite.mock.calls.map(([row]) => row.id)).toEqual([3, 5, 6]);
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onCreated).toHaveBeenCalledTimes(1);
        // Deterministically consume the success message instead of leaving it mid-render.
        expect(await screen.findByText('3 Empfänger angelegt')).toBeInTheDocument();
    });

    it('marks a per-row 409 as "Träger-ID vergeben" and keeps the modal open', async () => {
        createInvite.mockImplementation(async (row: { recipientEmail: string }) => {
            if (row.recipientEmail === 'b@example.org') {
                // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's CONFLICT_WITH_RESPONSE rejection (a raw Response)
                throw new Response(null, { status: 409 });
            }
        });
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false },
                    {
                        line: 2,
                        email: 'b@example.org',
                        firstName: 'B',
                        lastName: 'Two',
                        id: 9,
                        missingName: false,
                    },
                ],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: '2 Empfänger anlegen' }));

        expect(await rowCells('a@example.org').findByText('Angelegt')).toBeInTheDocument();
        expect(await rowCells('b@example.org').findByText('Träger-ID vergeben')).toBeInTheDocument();
        // Table refresh for the successful row, but the modal stays open for a retry.
        expect(onCreated).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
        // Only the failed row remains in the batch.
        expect(screen.getByRole('button', { name: '1 Empfänger anlegen' })).toBeInTheDocument();
        // Deterministically consume the partial-summary message instead of leaving it mid-render.
        expect(await screen.findByText('1 Empfänger angelegt, 1 fehlgeschlagen')).toBeInTheDocument();
    });

    // A 403 is about its own row (UserService#1006): its reason stands under that row.
    it("shows the backend's 403 reason under each row it hit", async () => {
        createInvite.mockImplementation(async () => {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's FORBIDDEN_WITH_RESPONSE rejection (a raw Response)
            throw new Response(JSON.stringify({ message: 'Only platform admins can create administrative accounts' }), {
                status: 403,
            });
        });
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false },
                    { line: 2, email: 'b@example.org', firstName: 'B', lastName: 'Two', missingName: false },
                ],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: '2 Empfänger anlegen' }));

        expect(await screen.findByText('0 Empfänger angelegt, 2 fehlgeschlagen')).toBeInTheDocument();
        expect(createInvite).toHaveBeenCalledTimes(2);
        ['a@example.org', 'b@example.org'].forEach((email) => {
            expect(rowCells(email).getByText('Nicht berechtigt')).toBeInTheDocument();
            expect(
                rowCells(email).getByText('Only platform admins can create administrative accounts'),
            ).toBeInTheDocument();
        });
        expect(onCreated).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('falls back to the tab-provided role wording on a bodyless 403', async () => {
        createInvite.mockImplementation(async () => {
            // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's FORBIDDEN_WITH_RESPONSE rejection (a raw Response)
            throw new Response(null, { status: 403 });
        });
        renderModal(
            parseResultOf({
                rows: [{ line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false }],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));

        expect(await rowCells('a@example.org').findByText('Nicht berechtigt')).toBeInTheDocument();
        expect(
            await screen.findByText('Nur Plattform-Administratoren können Träger-Admins einladen.'),
        ).toBeInTheDocument();
        expect(await screen.findByText('0 Empfänger angelegt, 1 fehlgeschlagen')).toBeInTheDocument();
        // Nothing was created: no table refresh, and the modal stays open.
        expect(onCreated).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    // A row may name a unit the admin does not own, so a 403 is that row's failure, not the batch's.
    it('keeps sending after a 403 on one row and marks only that row forbidden', async () => {
        createInvite.mockImplementation(async (row: { recipientEmail: string }) => {
            if (row.recipientEmail === 'b@example.org') {
                // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's FORBIDDEN_WITH_RESPONSE rejection (a raw Response)
                throw new Response(null, { status: 403 });
            }
        });
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false },
                    { line: 2, email: 'b@example.org', firstName: 'B', lastName: 'Two', missingName: false },
                    { line: 3, email: 'c@example.org', firstName: 'C', lastName: 'Three', missingName: false },
                ],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: '3 Empfänger anlegen' }));

        expect(await screen.findByText('2 Empfänger angelegt, 1 fehlgeschlagen')).toBeInTheDocument();
        expect(createInvite.mock.calls.map(([row]) => row.recipientEmail)).toEqual([
            'a@example.org',
            'b@example.org',
            'c@example.org',
        ]);
        expect(rowCells('a@example.org').getByText('Angelegt')).toBeInTheDocument();
        expect(rowCells('b@example.org').getByText('Nicht berechtigt')).toBeInTheDocument();
        expect(rowCells('c@example.org').getByText('Angelegt')).toBeInTheDocument();
        expect(onCreated).toHaveBeenCalledTimes(1);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('stops the batch on an SMTP 502, which fails every further row the same way', async () => {
        createInvite.mockImplementation(async (row: { recipientEmail: string }) => {
            if (row.recipientEmail === 'b@example.org') {
                // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's rejection (a raw Response)
                throw new Response(JSON.stringify({ reason: 'SMTP_SEND_FAILED', detail: 'SMTP_CREDENTIALS_MISSING' }), {
                    status: 502,
                });
            }
        });
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false },
                    { line: 2, email: 'b@example.org', firstName: 'B', lastName: 'Two', missingName: false },
                    { line: 3, email: 'c@example.org', firstName: 'C', lastName: 'Three', missingName: false },
                ],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: '3 Empfänger anlegen' }));

        expect(await screen.findByText('1 Empfänger angelegt, 2 fehlgeschlagen')).toBeInTheDocument();
        expect(createInvite).toHaveBeenCalledTimes(2);
        expect(rowCells('c@example.org').getByText('Versand fehlgeschlagen')).toBeInTheDocument();
    });

    it('lists rejected rows read-only, supports removing rows and editing names', async () => {
        renderModal(
            parseResultOf({
                rows: [{ line: 2, email: 'a@example.org', firstName: '', lastName: '', missingName: true }],
                rejected: [{ line: 3, cells: ['broken', 'X', 'Y'], reason: 'invalidEmail' }],
            }),
        );

        expect(screen.getByText('Abgelehnt')).toBeInTheDocument();
        // Rejected rows are excluded from the batch count.
        expect(screen.getByRole('button', { name: '1 Empfänger anlegen' })).toBeInTheDocument();

        // Missing names are inline-editable (owner: edit or delete such rows).
        await userEvent.type(screen.getByRole('textbox', { name: 'Vorname (a@example.org)' }), 'Anna');
        await userEvent.type(screen.getByRole('textbox', { name: 'Name (a@example.org)' }), 'Muster');

        await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));
        await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(1));
        expect(createInvite.mock.calls[0][0]).toMatchObject({
            recipientEmail: 'a@example.org',
            firstName: 'Anna',
            lastName: 'Muster',
        });
    });

    it('leaves empty Beratungsstellen-IDs to the service instead of guessing one', async () => {
        renderModal(
            parseResultOf({
                rows: [
                    // Only a BST-Admin founds a new Beratungsstelle, so this row is an agency-admin row.
                    {
                        line: 1,
                        email: 'a@example.org',
                        firstName: 'A',
                        lastName: 'One',
                        role: 'AGENCY_ADMIN',
                        missingName: false,
                    },
                    { line: 2, email: 'b@example.org', firstName: 'B', lastName: 'Two', id: 42, missingName: false },
                ],
            }),
            { idKind: 'agency', takenTenantIds: undefined },
        );

        // The agency id space is not resolvable client-side: an explicit id shows as
        // itself, an empty cell says who assigns it rather than inventing a number.
        // (antd renders the header twice — once for the sticky clone.)
        expect(screen.getAllByRole('columnheader', { name: 'Beratungsstellen-ID' }).length).toBeGreaterThan(0);
        expect(screen.queryByRole('columnheader', { name: 'Träger-ID' })).not.toBeInTheDocument();
        expect(rowCells('a@example.org').getByText('Automatisch')).toBeInTheDocument();
        expect(rowCells('b@example.org').getByText('42')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: '2 Empfänger anlegen' }));
        await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(2));
        expect(createInvite.mock.calls.map(([row]) => row.id)).toEqual([undefined, 42]);
        expect(await screen.findByText('2 Empfänger angelegt')).toBeInTheDocument();
    });

    /*
     * P3: the bulk path posts through the same create call, so it hits the same
     * 409. An "id taken" label there would be a lie — the row must name the real
     * cause so the admin knows to correct the address, not the id.
     */
    it('names an already registered recipient address in a per-row 409 (P3)', async () => {
        createInvite.mockRejectedValue(
            // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's CONFLICT_WITH_RESPONSE rejection (a raw Response)
            new Response(null, { status: 409, headers: { 'X-Reason': 'EMAIL_NOT_AVAILABLE' } }),
        );
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', id: 42, missingName: false },
                ],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));

        expect(await rowCells('a@example.org').findByText('E-Mail-Adresse bereits vorhanden')).toBeInTheDocument();
        expect(rowCells('a@example.org').queryByText('Träger-ID vergeben')).not.toBeInTheDocument();
        expect(onCreated).not.toHaveBeenCalled();
    });

    it('names the agency id space in a per-row 409', async () => {
        createInvite.mockRejectedValue(
            // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's CONFLICT_WITH_RESPONSE rejection (a raw Response)
            new Response(null, { status: 409 }),
        );
        renderModal(
            parseResultOf({
                rows: [
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', id: 42, missingName: false },
                ],
            }),
            { idKind: 'agency', takenTenantIds: undefined },
        );

        await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));

        expect(await rowCells('a@example.org').findByText('Beratungsstellen-ID vergeben')).toBeInTheDocument();
        expect(onCreated).not.toHaveBeenCalled();
        expect(await screen.findByText('0 Empfänger angelegt, 1 fehlgeschlagen')).toBeInTheDocument();
    });

    it('removes rows individually and disables the confirm button once nothing is importable', async () => {
        renderModal(
            parseResultOf({
                rows: [{ line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false }],
            }),
        );

        await userEvent.click(screen.getByRole('button', { name: 'Zeile entfernen (a@example.org)' }));

        expect(screen.queryByText('a@example.org')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '0 Empfänger anlegen' })).toBeDisabled();
    });

    describe('Ziel, Rolle, Vorlage and Themen & Fachbereiche columns', () => {
        const TEMPLATES = [
            {
                id: 11,
                kind: 'COUNSELLOR_INVITE' as const,
                name: 'Standard',
                language: 'de',
                subject: 'S',
                body: 'B',
                active: true,
                createDate: '2026-07-01T00:00:00Z',
                updateDate: null,
            },
        ];
        // Default: a new Beratungsstelle with its number (a counsellor row must name it).
        const row = (line: number, email: string, extra: Record<string, unknown> = {}) => ({
            line,
            email,
            firstName: 'A',
            lastName: 'B',
            id: 900,
            missingName: false,
            ...extra,
        });
        const renderAgency = (rows: ReturnType<typeof row>[], props: Record<string, unknown> = {}) =>
            renderModal(parseResultOf({ rows: rows as never }), {
                idKind: 'agency',
                tabRole: 'COUNSELLOR',
                templates: TEMPLATES,
                ...props,
            });

        it('sends an existing agency, the row template and the topic permission; an empty topic cell is omitted', async () => {
            const user = userEvent.setup();
            renderAgency([
                row(2, 'anna@x.de', { id: 42, target: 'EXISTING', template: 'standard', topicPermission: 'CREATE' }),
                row(3, 'bernd@x.de'),
            ]);

            await user.click(screen.getByRole('button', { name: '2 Empfänger anlegen' }));
            await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(2));
            expect(createInvite.mock.calls[0][0]).toMatchObject({
                recipientEmail: 'anna@x.de',
                id: 42,
                target: 'EXISTING',
                role: 'COUNSELLOR',
                templateId: 11,
                topicPermission: 'CREATE',
            });
            expect(createInvite.mock.calls[1][0]).toMatchObject({
                target: 'NEW',
                role: 'COUNSELLOR',
                templateId: undefined,
            });
            expect(createInvite.mock.calls[1][0]).not.toHaveProperty('topicPermission', expect.anything());
        });

        it('says what an empty topic cell means', () => {
            renderAgency([row(2, 'anna@x.de')]);
            expect(
                rowCells('anna@x.de').getByText('Leere CSV-Zelle = Darf weitere Fachbereiche auswählen'),
            ).toBeInTheDocument();
        });

        it('shows the new columns with readable values', () => {
            renderAgency([row(2, 'anna@x.de', { id: 42, target: 'EXISTING', topicPermission: 'SELECT_EXISTING' })]);
            const cells = rowCells('anna@x.de');
            expect(cells.getByText('Bestehend')).toBeInTheDocument();
            expect(cells.getByText('Berater:in')).toBeInTheDocument();
            expect(cells.getByText('wie in der Leiste')).toBeInTheDocument();
            expect(cells.getByText('Darf weitere Fachbereiche auswählen')).toBeInTheDocument();
        });

        it.each([
            [
                { template: 'Gibtsnicht' },
                'Die Vorlage „Gibtsnicht“ gibt es hier nicht. Aktive Vorlagen: Standard (Zeile 2).',
            ],
            [
                { id: undefined },
                'Berater:innen für eine neue Beratungsstelle brauchen deren Nummer — dieselbe wie in der Zeile der BST-Admin (Zeile 2).',
            ],
            [
                { role: 'COUNSELLOR', alsoCounsellor: false },
                '„Berät auch“ gilt nur für BST-Admins — bitte leer lassen (Zeile 2).',
            ],
        ])('holds back a row with a context problem and says why in German (%o)', (extra, reason) => {
            renderAgency([row(2, 'anna@x.de', extra), row(3, 'bernd@x.de')]);
            expect(rowCells('anna@x.de').getByText('Abgelehnt')).toBeInTheDocument();
            expect(rowCells('anna@x.de').getByText(reason)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '1 Empfänger anlegen' })).toBeInTheDocument();
        });

        it('refuses a role the viewer may not hand out', () => {
            renderAgency([row(2, 'anna@x.de', { role: 'TENANT_ADMIN' })], { viewerScope: 'agency' });
            expect(
                rowCells('anna@x.de').getByText('Die Rolle „Träger-Admin“ dürfen Sie nicht vergeben (Zeile 2).'),
            ).toBeInTheDocument();
        });

        it('rejects a topic permission for a non-counsellor role', () => {
            renderModal(parseResultOf({ rows: [row(2, 'anna@x.de', { topicPermission: 'NONE' })] as never }));
            expect(
                rowCells('anna@x.de').getByText(
                    '„Themen & Fachbereiche“ gilt nur für Berater:innen — bitte leer lassen (Zeile 2).',
                ),
            ).toBeInTheDocument();
        });

        it('sends "bestehend" on the Träger tab as an existing Träger', async () => {
            renderModal(parseResultOf({ rows: [row(2, 'anna@x.de', { id: 9, target: 'EXISTING' })] as never }));
            await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));
            await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(1));
            expect(createInvite.mock.calls[0][0]).toMatchObject({ id: 9, target: 'EXISTING', role: 'TENANT_ADMIN' });
        });

        it('sends the founding BST-Admin row with "Berät auch" and every role the viewer may hand out', async () => {
            renderAgency([
                row(2, 'bernd@x.de', { role: 'AGENCY_ADMIN', alsoCounsellor: false }),
                row(3, 'carla@x.de', { topicPermission: 'SELECT_EXISTING' }),
            ]);
            await userEvent.click(screen.getByRole('button', { name: '2 Empfänger anlegen' }));
            await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(2));
            expect(createInvite.mock.calls[0][0]).toMatchObject({
                id: 900,
                role: 'AGENCY_ADMIN',
                alsoCounsellor: false,
                topicPermission: undefined,
            });
            expect(createInvite.mock.calls[1][0]).toMatchObject({
                id: 900,
                role: 'COUNSELLOR',
                alsoCounsellor: undefined,
                topicPermission: 'SELECT_EXISTING',
            });
        });

        it('sends founding BST-Admin rows before the rows that wait for them', async () => {
            renderAgency([
                row(2, 'carla@x.de'),
                row(3, 'bernd@x.de', { role: 'AGENCY_ADMIN' }),
                row(4, 'dora@x.de', { id: 42, target: 'EXISTING' }),
            ]);
            await userEvent.click(screen.getByRole('button', { name: '3 Empfänger anlegen' }));
            await waitFor(() => expect(createInvite).toHaveBeenCalledTimes(3));
            expect(createInvite.mock.calls.map(([sent]) => sent.recipientEmail)).toEqual([
                'bernd@x.de',
                'carla@x.de',
                'dora@x.de',
            ]);
        });

        it('refreshes a waiting row from the invite list once the rows are sent', async () => {
            createInvite.mockResolvedValueOnce({ inviteId: 7, waiting: true, noUnitAdmin: true });
            const { rerender } = renderAgency([row(2, 'carla@x.de')]);
            await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));
            expect(await rowCells('carla@x.de').findByText(/Keine BST-Admin/)).toBeInTheDocument();

            rerender(
                <InviteCsvImportModal
                    createInvite={createInvite}
                    idKind="agency"
                    invites={[{ id: 7, inviteStatus: 'WAITING_FOR_UNIT', queueProblem: null } as never]}
                    parseResult={parseResultOf({ rows: [row(2, 'carla@x.de')] as never })}
                    tabRole="COUNSELLOR"
                    templates={TEMPLATES}
                    onClose={onClose}
                    onCreated={onCreated}
                />,
            );

            expect(rowCells('carla@x.de').queryByText(/Keine BST-Admin/)).not.toBeInTheDocument();
            expect(
                rowCells('carla@x.de').getByText('Geht raus, sobald die Beratungsstelle angelegt ist.'),
            ).toBeInTheDocument();
        });

        it('marks a row the backend stored as waiting for its new Beratungsstelle', async () => {
            createInvite.mockResolvedValueOnce({ waiting: true, noUnitAdmin: true });
            renderAgency([row(2, 'carla@x.de')]);
            await userEvent.click(screen.getByRole('button', { name: '1 Empfänger anlegen' }));
            expect(await rowCells('carla@x.de').findByText('Vorgemerkt')).toBeInTheDocument();
            expect(
                rowCells('carla@x.de').getByText(
                    'Keine BST-Admin: Für diese neue Beratungsstelle fehlt noch die Zeile der BST-Admin.',
                ),
            ).toBeInTheDocument();
        });

        it('sends other roles to the Berater tab when the Träger tab only founds Träger', () => {
            renderModal(parseResultOf({ rows: [row(2, 'anna@x.de', { role: 'COUNSELLOR' })] as never }), {
                tabRoles: ['TENANT_ADMIN'],
            });
            expect(
                rowCells('anna@x.de').getByText(
                    'Die Rolle „Berater:in“ wird im Tab „Berater-Invites“ eingeladen, nicht hier (Zeile 2).',
                ),
            ).toBeInTheDocument();
        });

        it('rejects a new Beratungsstelle when the viewer has no own Träger to found it in', () => {
            renderAgency(
                [
                    row(2, 'anna@x.de', { role: 'AGENCY_ADMIN' }),
                    row(3, 'ben@x.de'),
                    row(4, 'carla@x.de', { id: 42, target: 'EXISTING' }),
                ],
                { ownTenantKnown: false },
            );
            const hint =
                'Eine neue Beratungsstelle braucht einen Träger. Ohne eigenen Träger laden Sie hier nur in bestehende Beratungsstellen ein (Ziel „bestehend“) (Zeile {{line}}).';
            expect(rowCells('anna@x.de').getByText(hint.replace('{{line}}', '2'))).toBeInTheDocument();
            expect(rowCells('ben@x.de').getByText(hint.replace('{{line}}', '3'))).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '1 Empfänger anlegen' })).toBeEnabled();
        });

        it('spells out parse-level rejections next to the chip', () => {
            renderModal(
                parseResultOf({
                    rejected: [
                        {
                            line: 4,
                            cells: ['c@x.de'],
                            reason: 'invalidTopicPermission',
                            email: 'c@x.de',
                            firstName: '',
                            lastName: '',
                        },
                    ],
                }),
                { idKind: 'agency' },
            );
            expect(
                screen.getByText(
                    'Unbekannter Wert bei „Themen & Fachbereiche“ — erlaubt sind NONE, SELECT_EXISTING, CREATE, true oder false (Zeile 4)',
                ),
            ).toBeInTheDocument();
        });
    });
});
