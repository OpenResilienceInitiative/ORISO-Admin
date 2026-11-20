import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

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
vi.mock('../../../../components/CardEditable', async () => {
    const { Form } = await import('antd');
    return {
        CardEditable: ({
            titleKey,
            headerIcon,
            children,
        }: {
            titleKey: string;
            headerIcon?: ReactNode;
            children?: ReactNode;
        }) => (
            <section data-testid="traeger-card" data-title={titleKey} data-has-icon={String(!!headerIcon)}>
                <Form>{children}</Form>
            </section>
        ),
    };
});
vi.mock('../../../../components/EntityStatusCard', () => ({ ManagedEntityStatus: () => null }));
// The contact-person tile (#1534) loads its own data and has its own tests.
vi.mock('./TraegerContactPersonTile', () => ({ TraegerContactPersonTile: () => null }));
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

    // Frank, 2026-11-20: licence and sender moved to the Träger tab "Weitere", with their own save.
    it('holds master data only: no licence and no sender block', () => {
        render(<GeneralTenantSettings />);

        const card = within(screen.getByTestId('traeger-card'));
        expect(card.getByLabelText(/tenants.add.form.name.placeholder/)).toBeInTheDocument();
        expect(card.queryByLabelText(/tenants.add.form.allowedConsultantsLicense.placeholder/)).toBeNull();
        expect(card.queryByRole('group', { name: 'tenants.form.section.sender' })).toBeNull();
        [
            'tenants.form.sender.legalName',
            'tenants.form.sender.contactEmail',
            'tenants.form.sender.contactPhone',
        ].forEach((label) => expect(card.queryByLabelText(new RegExp(label))).toBeNull());
    });
});
