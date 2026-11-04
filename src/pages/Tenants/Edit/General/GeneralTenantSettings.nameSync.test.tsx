import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const tenant = vi.hoisted(() => ({ current: { name: 'Alter Name' } as Record<string, unknown> }));

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '7' }), useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: true } }),
}));
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: tenant.current, isLoading: false }),
}));
vi.mock('../../../../hooks/useAddOrUpdateTenant.hook', () => ({ useAddOrUpdateTenant: () => ({ mutate: vi.fn() }) }));
vi.mock('../../../../hooks/useAddOrUpdateTenantAdmin.hook', () => ({
    useAddOrUpdateTenantAdmin: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../../components/Tenants/GeneralSettings', () => ({
    GeneralSettings: ({ leadingTiles }: { leadingTiles?: ReactNode }) => <div>{leadingTiles}</div>,
}));

// eslint-disable-next-line import/first
import { GeneralTenantSettings } from './index';

const nameField = () => screen.getByLabelText(/tenants\.add\.form\.name\.placeholder/) as HTMLInputElement;

describe('Trägerinformationen next to Name & Slogan', () => {
    beforeEach(() => {
        tenant.current = { name: 'Alter Name', address: 'Musterstraße 1' };
    });

    it('takes over a name saved in the neighbouring tile, so its own save cannot bring the old one back', () => {
        const { rerender } = render(<GeneralTenantSettings />);
        expect(nameField().value).toBe('Alter Name');

        tenant.current = { ...tenant.current, name: 'Neuer Name' };
        rerender(<GeneralTenantSettings />);

        expect(nameField().value).toBe('Neuer Name');
    });
});
