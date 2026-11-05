import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '7' }), useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('antd/lib/form/Form', () => ({ useForm: () => [{ setFields: vi.fn(), submit: vi.fn() }] }));
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: { multitenancyWithSingleDomainEnabled: false } }),
}));
vi.mock('../../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: {}, isLoading: false }),
}));
vi.mock('../../../../hooks/useAddOrUpdateTenant.hook', () => ({ useAddOrUpdateTenant: () => ({ mutate: vi.fn() }) }));
vi.mock('../../../../hooks/useAddOrUpdateTenantAdmin.hook', () => ({
    useAddOrUpdateTenantAdmin: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../../../components/CardEditable', () => ({
    CardEditable: ({ titleKey, headerIcon }: { titleKey: string; headerIcon?: ReactNode }) => (
        <section data-testid="traeger-card" data-title={titleKey} data-has-icon={String(!!headerIcon)} />
    ),
}));
vi.mock('../../../../components/Tenants/GeneralSettings', () => ({
    GeneralSettings: ({
        tenantId,
        section,
        leadingTiles,
    }: {
        tenantId?: string;
        section?: string;
        leadingTiles?: ReactNode;
    }) => (
        <div data-testid="master-data-tiles" data-tenant={tenantId} data-section={section}>
            {leadingTiles}
        </div>
    ),
}));

// eslint-disable-next-line import/first
import { GeneralTenantSettings } from './index';

describe('platform admin editing a Träger: Stammdaten tab', () => {
    it('shows the Trägerinformationen card inside the master data raster, next to the master data tiles', () => {
        render(<GeneralTenantSettings />);

        const raster = screen.getByTestId('master-data-tiles');
        expect(raster).toHaveAttribute('data-section', 'masterData');
        expect(raster).toHaveAttribute('data-tenant', '7');
        expect(raster).toContainElement(screen.getByTestId('traeger-card'));
        expect(screen.getByTestId('traeger-card')).toHaveAttribute('data-title', 'tenants.add.mainTenantTitle');
    });

    it('gives the Trägerinformationen card a header icon like the tiles next to it', () => {
        render(<GeneralTenantSettings />);

        expect(screen.getByTestId('traeger-card')).toHaveAttribute('data-has-icon', 'true');
    });
});
