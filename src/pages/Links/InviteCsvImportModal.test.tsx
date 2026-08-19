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
                    { line: 1, email: 'a@example.org', firstName: 'A', lastName: 'One', missingName: false },
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
});
