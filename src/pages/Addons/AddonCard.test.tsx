import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AdminAddon } from '../../addons/addonTypes';
import { AddonCard } from './AddonCard';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de', language: 'de' } }),
}));

const mutate = vi.hoisted(() => vi.fn());
vi.mock('./useAddons', () => ({
    useSetTenantEnabled: () => ({ mutate, isPending: false }),
    useAddonStats: () => ({ isLoading: false, isError: false, data: { stats: [{ id: 'tools.released', value: 12 }] } }),
}));

const addon: AdminAddon = {
    manifest: {
        name: 'digisucht-tools',
        version: '1.4.0',
        apps: [{ id: 'goals', title: { de: 'Ziele', en: 'Goals' }, slots: ['asker.navigation', 'admin.page'] }],
        stats: [{ id: 'tools.released', label: { de: 'Freigegebene Tools' }, type: 'count' }],
    },
    tenantId: 7,
    enabled: true,
    agencyOverrides: [],
};

const renderCard = (isSuperAdmin: boolean) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <AddonCard addon={addon} tenantId={7} isSuperAdmin={isSuperAdmin} />
        </QueryClientProvider>,
    );

beforeEach(() => mutate.mockReset());

describe('AddonCard', () => {
    it('shows name, version, apps and statistics', () => {
        renderCard(false);
        expect(screen.getByText('digisucht-tools')).toBeInTheDocument();
        expect(screen.getByText('Ziele')).toBeInTheDocument();
        expect(screen.getByText('admin.page')).toBeInTheDocument();
        expect(screen.getByText('Freigegebene Tools')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('lets a SuperAdmin switch the add-on for the Träger', () => {
        renderCard(true);
        const toggle = screen.getByRole('switch', { name: 'addons.tenant.switchLabel' });
        expect(toggle).toBeEnabled();
        expect(toggle).toBeChecked();
        expect(screen.queryByText('addons.tenant.readOnly')).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(mutate).toHaveBeenCalledWith(false, expect.anything());
    });

    it('shows a Träger admin the switch read-only', () => {
        renderCard(false);
        const toggle = screen.getByRole('switch', { name: 'addons.tenant.switchLabel' });
        expect(toggle).toBeDisabled();
        expect(toggle).toHaveAccessibleDescription('addons.tenant.readOnly');

        fireEvent.click(toggle);
        expect(mutate).not.toHaveBeenCalled();
    });
});
