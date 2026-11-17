import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AdminAddon } from '../../addons/addonTypes';
import { AddonCard } from './AddonCard';
import type { AdminPageEntry } from './AddonsLayout';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'de', language: 'de' } }),
}));

vi.mock('./AgencyOverrides', () => ({ AgencyOverrides: () => <div>agency overrides</div> }));
vi.mock('./AddonSettingsSection', () => ({ AddonSettingsSection: () => <div>settings form</div> }));

const mutate = vi.hoisted(() => vi.fn());
vi.mock('./useAddons', () => ({
    useSetTenantEnabled: () => ({ mutate, isPending: false }),
    useAddonReadme: () => ({ data: 'Hilft bei **Zielen**.' }),
    useAddonStats: () => ({ isLoading: false, isError: false, data: { stats: [{ id: 'tools.released', value: 12 }] } }),
}));

const addon = (overrides: Partial<AdminAddon> = {}): AdminAddon => ({
    manifest: {
        name: 'digisucht-tools',
        version: '1.4.0',
        apps: [{ id: 'goals', title: { de: 'Ziele', en: 'Goals' }, slots: ['asker.navigation', 'admin.page'] }],
        stats: [{ id: 'tools.released', label: { de: 'Freigegebene Tools' }, type: 'count' }],
    },
    tenantId: 7,
    mode: 'TENANT',
    tenantCanSwitch: true,
    hasReadme: true,
    enabled: true,
    agencyOverrides: [],
    ...overrides,
});

const adminPage = (id: string, title: string): AdminPageEntry => ({
    addon: { name: 'digisucht-tools', version: '1.4.0', entry: '/ui/e.js', apiBase: '/api', apps: [] },
    app: { id, title: { de: title }, slots: ['admin.page'] },
    to: `/addons/apps/digisucht-tools/${id}`,
});

const renderCard = (value: AdminAddon, defaultOpen = false, adminPages: AdminPageEntry[] = []) =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter>
                <AddonCard
                    addon={value}
                    tenantId={7}
                    adminPages={adminPages}
                    canSwitch={!!value.tenantCanSwitch}
                    showReadme
                    defaultOpen={defaultOpen}
                />
            </MemoryRouter>
        </QueryClientProvider>,
    );

beforeEach(() => mutate.mockReset());

describe('AddonCard', () => {
    it('lets the Träger switch the add-on when the platform admin leaves it to them', () => {
        renderCard(addon());
        const toggle = screen.getByRole('switch', { name: 'addons.status.active' });
        expect(toggle).toBeChecked();
        fireEvent.click(toggle);
        expect(mutate).toHaveBeenCalledWith(false, expect.anything());
    });

    it('shows only the state, without a switch, when the add-on is always on', () => {
        renderCard(addon({ mode: 'ON', tenantCanSwitch: false }));
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
        expect(screen.getByText('addons.status.active')).toBeInTheDocument();
    });

    it('shows the readme and keeps the details folded until asked', () => {
        renderCard(addon());
        expect(screen.getByText('Zielen')).toBeInTheDocument();
        expect(screen.queryByText('agency overrides')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'addons.details.show' }));
        expect(screen.getByText('agency overrides')).toBeInTheDocument();
        expect(screen.queryByText('settings form')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'addons.stats.title' }));
        expect(screen.getByText('Freigegebene Tools')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'addons.settings.title' }));
        expect(screen.getByText('settings form')).toBeInTheDocument();
    });

    it('names the tab of a single admin page after its app', () => {
        renderCard(addon(), true, [adminPage('report', 'Auswertung')]);
        fireEvent.click(screen.getByRole('tab', { name: 'Auswertung' }));
        expect(screen.getByRole('link', { name: 'Auswertung' })).toBeInTheDocument();
    });

    it('groups several admin pages under one tab', () => {
        renderCard(addon(), true, [adminPage('report', 'Auswertung'), adminPage('export', 'Export')]);
        fireEvent.click(screen.getByRole('tab', { name: 'addons.adminPages' }));
        expect(screen.getByRole('link', { name: 'Auswertung' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Export' })).toBeInTheDocument();
    });
});
