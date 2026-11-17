import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AddonTenantState } from '../../addons/addonTypes';
import { AddonTenantsTable, isActiveForTenant, tenantRows } from './AddonTenantsTable';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
        i18n: { resolvedLanguage: 'de', language: 'de' },
    }),
}));

const setMode = vi.hoisted(() => vi.fn());
vi.mock('../../api/addons/addonsApi', () => ({ setAddonModeForTenant: setMode }));

const states: AddonTenantState[] = [
    {
        tenantId: 1,
        mode: 'TENANT',
        enabled: true,
        updatedAt: '2026-11-12T16:36:22Z',
        agenciesEnabled: 0,
        agenciesDisabled: 1,
    },
    { tenantId: 9, mode: 'ON_HIDDEN', enabled: false, agenciesEnabled: 2, agenciesDisabled: 0 },
];
const tenants = [
    { id: 1, name: 'DigiSucht' },
    { id: 6, name: 'Bits' },
];

vi.mock('./useAddons', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./useAddons')>()),
    useAllTenants: () => ({ data: tenants, isLoading: false, isError: false }),
    useAddonTenants: () => ({ data: states, isLoading: false, isError: false }),
}));

const renderTable = (onSelect = vi.fn()) => {
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AddonTenantsTable addonName="digisucht-tools" selectedTenantId={null} onSelect={onSelect} />
        </QueryClientProvider>,
    );
    return onSelect;
};

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

beforeEach(() => setMode.mockReset().mockResolvedValue({}));

describe('tenantRows', () => {
    it('joins Träger with their state and keeps Träger the list does not know', () => {
        const rows = tenantRows(tenants, states);
        expect(rows.map((row) => [row.id, row.state?.mode ?? null])).toEqual([
            [6, null],
            [1, 'TENANT'],
            [9, 'ON_HIDDEN'],
        ]);
        expect(rows.map(isActiveForTenant)).toEqual([false, true, true]);
    });
});

describe('AddonTenantsTable', () => {
    it('shows each Träger with its mode, no switch, and the Träger choice in TENANT mode', () => {
        renderTable();
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
        const digisucht = rowOf('DigiSucht (1)');
        expect(within(digisucht).getByText('addons.mode.TENANT')).toBeInTheDocument();
        expect(within(digisucht).getByText('addons.mode.tenantOn')).toBeInTheDocument();
        expect(within(digisucht).getByText(/addons.tenants.agenciesOff/)).toBeInTheDocument();
        expect(within(rowOf('Bits (6)')).getByText('addons.mode.OFF')).toBeInTheDocument();
        expect(screen.getByText(/addons.tenant.unnamed/)).toBeInTheDocument();
    });

    it('explains the modes from the mode column', async () => {
        renderTable();
        fireEvent.click(screen.getByRole('button', { name: 'addons.mode.help.open' }));
        expect(await screen.findByText('addons.mode.help.ON_HIDDEN')).toBeInTheDocument();
    });

    it('filters to Träger the add-on is available for', () => {
        renderTable();
        fireEvent.click(screen.getByText('addons.tenants.filter.available'));
        expect(screen.getByText('DigiSucht (1)')).toBeInTheDocument();
        expect(screen.queryByText('Bits (6)')).not.toBeInTheDocument();
    });

    it('sets the mode of a Träger', async () => {
        renderTable();
        const select = within(rowOf('Bits (6)')).getByRole('combobox');
        fireEvent.mouseDown(select);
        fireEvent.click(await screen.findByTitle('addons.mode.ON'));
        await waitFor(() => expect(setMode).toHaveBeenCalledWith('digisucht-tools', 6, 'ON'));
    });

    it('locks the mode of a Träger until its change is saved', async () => {
        let finishSave: () => void = () => {};
        setMode.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finishSave = () => resolve({});
                }),
        );
        renderTable();
        const select = () => within(rowOf('Bits (6)')).getByRole('combobox');
        fireEvent.mouseDown(select());
        fireEvent.click(await screen.findByTitle('addons.mode.ON'));

        await waitFor(() => expect(select()).toBeDisabled());
        expect(within(rowOf('DigiSucht (1)')).getByRole('combobox')).not.toBeDisabled();

        finishSave();
        await waitFor(() => expect(select()).not.toBeDisabled());
    });

    it('selects a Träger with its manage button', () => {
        const onSelect = renderTable();
        fireEvent.click(within(rowOf('Bits (6)')).getByRole('button', { name: /addons.tenants.manageFor/ }));
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 6, name: 'Bits' }));
    });
});
