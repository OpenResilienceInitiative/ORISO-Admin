import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- valid `storybook` package-exports subpath; the eslint resolver predates exports maps
import { userEvent, within } from 'storybook/test';
import type { IdAllocationClient } from '../../api/idAllocation/idAllocation';
import { UserRole } from '../../enums/UserRole';
import { setStoryAuth, withAdminProviders } from '../../utils/storybook/adminStoryDecorators';
import type { ParseInviteCsvResult } from './csv/parseInviteCsv';
import { InviteComposer, type InviteSendMode } from './InviteComposer';
import { InviteCsvImportModal } from './InviteCsvImportModal';

/**
 * A parse result as `parseInviteCsv` would produce it for a mixed file: valid
 * rows (some without names, some without Träger-ID — those get auto-populated)
 * plus rejected rows carrying their line number and reason.
 */
const MIXED_PARSE_RESULT: ParseInviteCsvResult = {
    rows: [
        { line: 2, email: 'maria.huber@example.org', firstName: 'Maria', lastName: 'Huber', missingName: false },
        {
            line: 3,
            email: 'peter.maier@example.org',
            firstName: 'Peter',
            lastName: 'Maier',
            id: 7,
            missingName: false,
        },
        { line: 4, email: 'ohne.namen@example.org', firstName: '', lastName: '', missingName: true },
    ],
    rejected: [
        { line: 5, cells: ['keine-email', 'Ida', 'Klein'], reason: 'invalidEmail' },
        { line: 6, cells: ['jan.beck@example.org', 'Jan', 'Beck', 'abc'], reason: 'invalidId' },
    ],
    delimiter: ',',
    headerSkipped: true,
};

/**
 * Allocation stub for the composer's Träger-ID field (the composer talks to an
 * `IdAllocationClient` since U4; stories inject a stub instead of the real
 * TenantService client). Ids 1, 2 and 4 are taken — matching the modal's
 * `takenTenantIds` below.
 */
const TAKEN_IDS = new Set<number>([1, 2, 4]);

const stubbedTenantIdAllocation: IdAllocationClient = {
    checkIdAvailability: async (id) => ({ id, state: TAKEN_IDS.has(id) ? 'ASSIGNED' : 'FREE' }),
    nextFreeId: async ({ from, direction }) => {
        let candidate = from == null ? 1 : from + (direction === 'up' ? 1 : -1);
        while (candidate >= 1 && candidate <= 999) {
            if (!TAKEN_IDS.has(candidate)) return { id: candidate };
            candidate += direction === 'up' ? 1 : -1;
        }
        return { id: null };
    },
};

/**
 * Composer wired like AccountInvitesTab: picking a CSV via the "⋮" more-menu
 * parses it client-side and opens the preview modal; confirming "creates" the
 * rows against a fake backend that rejects Träger-ID 7 with 409 so the per-row
 * failure marking is visible.
 */
const CsvImportHarness = () => {
    const [csvImport, setCsvImport] = useState<{ result: ParseInviteCsvResult; sendMode: InviteSendMode } | null>(null);

    return (
        <div style={{ padding: 24 }}>
            <InviteComposer
                persistKey="TENANT_ADMIN"
                requireTenantId
                templates={[]}
                tenantIdAllocation={stubbedTenantIdAllocation}
                onCsvParsed={(result, sendMode) => setCsvImport({ result, sendMode })}
                onManageTemplates={() => {}}
                onSubmit={() => true}
            />
            {csvImport && (
                <InviteCsvImportModal
                    idKind="tenant"
                    createInvite={async (row) => {
                        await new Promise((resolve) => {
                            setTimeout(resolve, 400);
                        });
                        if (row.id === 7) {
                            // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's CONFLICT_WITH_RESPONSE rejection (a raw Response)
                            throw new Response(null, { status: 409 });
                        }
                    }}
                    parseResult={csvImport.result}
                    takenTenantIds={new Set([1, 2, 4])}
                    onClose={() => setCsvImport(null)}
                    onCreated={() => {}}
                />
            )}
        </div>
    );
};

const meta = {
    title: 'Organisms/Pages/Links/InviteCsvImport',
    component: CsvImportHarness,
    parameters: { layout: 'fullscreen' },
    decorators: [
        withAdminProviders,
        (Story) => {
            setStoryAuth([UserRole.TenantAdmin]);
            return <Story />;
        },
    ],
} satisfies Meta<typeof CsvImportHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The "⋮" more-menu before the search pill, opened: "CSV-Datei importieren". */
export const MoreMenuOpen: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('button', { name: 'Weitere Aktionen' }));
    },
};

/**
 * Preview modal with mixed rows: valid entries (Träger-IDs 3 and 5 auto-populated
 * around the explicit 7 and the taken ids 1, 2, 4), an importable row without
 * names (inline-editable), and two rejected rows (invalid e-mail on line 5,
 * invalid Träger-ID on line 6) that are excluded from the batch count.
 */
export const PreviewModalMixedRows: Story = {
    render: () => (
        <InviteCsvImportModal
            idKind="tenant"
            createInvite={async (row) => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 400);
                });
                if (row.id === 7) {
                    // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's CONFLICT_WITH_RESPONSE rejection (a raw Response)
                    throw new Response(null, { status: 409 });
                }
            }}
            parseResult={MIXED_PARSE_RESULT}
            takenTenantIds={new Set([1, 2, 4])}
            onClose={() => {}}
            onCreated={() => {}}
        />
    ),
};

/**
 * Berater tab: the same file, read against the agency id space. The explicit 7 is
 * pinned (and rejected with 409 here, as a taken agency id would be), while the
 * empty cells stay "Automatisch" — AgencyService picks the free id on create.
 */
export const PreviewModalAgencyIds: Story = {
    render: () => (
        <InviteCsvImportModal
            idKind="agency"
            createInvite={async (row) => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 400);
                });
                if (row.id === 7) {
                    // eslint-disable-next-line @typescript-eslint/no-throw-literal -- mirrors fetchData's CONFLICT_WITH_RESPONSE rejection (a raw Response)
                    throw new Response(null, { status: 409 });
                }
            }}
            parseResult={MIXED_PARSE_RESULT}
            onClose={() => {}}
            onCreated={() => {}}
        />
    ),
};
