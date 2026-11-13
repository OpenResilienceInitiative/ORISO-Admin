import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddonTenantState } from '../../addons/addonTypes';
import { AddonTenantsTable, tenantRows } from './AddonTenantsTable';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: Record<string, unknown>) => (options ? `${key} ${JSON.stringify(options)}` : key),
        i18n: { resolvedLanguage: 'de', language: 'de' },
    }),
}));

const setEnabled = vi.hoisted(() => vi.fn());
vi.mock('../../api/addons/addonsApi', () => ({ setAddonEnabledForTenant: setEnabled }));

const states: AddonTenantState[] = [
    { tenantId: 1, enabled: true, updatedAt: '2026-11-12T16:36:22Z', agenciesEnabled: 0, agenciesDisabled: 1 },
    { tenantId: 9, enabled: false, agenciesEnabled: 2, agenciesDisabled: 0 },
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

beforeEach(() => setEnabled.mockReset().mockResolvedValue({}));

describe('tenantRows', () => {
    it('joins Träger with their switches and keeps Träger the list does not know', () => {
        const rows = tenantRows(tenants, states);
        expect(rows.map((row) => [row.id, row.state?.enabled ?? null])).toEqual([
            [6, null],
            [1, true],
            [9, false],
        ]);
    });
});

describe('AddonTenantsTable', () => {
    it('lists every Träger with switch, overrides and last change', () => {
        renderTable();
        const digisucht = screen.getByText('DigiSucht (1)').closest('tr') as HTMLElement;
        expect(within(digisucht).getByRole('switch')).toBeChecked();
        expect(within(digisucht).getByText(/addons.tenants.agenciesOff/)).toBeInTheDocument();
        const bits = screen.getByText('Bits (6)').closest('tr') as HTMLElement;
        expect(within(bits).getByRole('switch')).not.toBeChecked();
        expect(screen.getByText(/addons.tenant.unnamed/)).toBeInTheDocument();
    });

    it('filters to active Träger', () => {
        renderTable();
        fireEvent.click(screen.getByText('addons.tenants.filter.active'));
        expect(screen.getByText('DigiSucht (1)')).toBeInTheDocument();
        expect(screen.queryByText('Bits (6)')).not.toBeInTheDocument();
    });

    it('switches a Träger without selecting the row', async () => {
        const onSelect = renderTable();
        const bits = screen.getByText('Bits (6)').closest('tr') as HTMLElement;
        fireEvent.click(within(bits).getByRole('switch'));
        await waitFor(() => expect(setEnabled).toHaveBeenCalledWith('digisucht-tools', 6, true));
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('selects a Träger by clicking its row', () => {
        const onSelect = renderTable();
        fireEvent.click(screen.getByText('Bits (6)'));
        expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 6, name: 'Bits' }));
    });
});
