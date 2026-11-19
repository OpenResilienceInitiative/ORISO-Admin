import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({
    roles: [] as string[],
    isSuperAdmin: true,
    multitenancyWithSingleDomainEnabled: false,
}));

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '7' }) }));
vi.mock('../../../../components/Tenants/AppSettings/FunctionalitiesGrid', () => ({
    FunctionalitiesGrid: (props: Record<string, unknown>) => <div data-testid="grid">{JSON.stringify(props)}</div>,
}));
vi.mock('../../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: { multitenancyWithSingleDomainEnabled: mocks.multitenancyWithSingleDomainEnabled },
    }),
}));
vi.mock('../../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: (role: string) => mocks.roles.includes(role),
        isSuperAdmin: mocks.isSuperAdmin,
    }),
}));

// eslint-disable-next-line import/first
import { TenantAppSettings } from './index';

const gridProps = () => JSON.parse(screen.getByTestId('grid').textContent ?? '{}');

describe('platform admin editing a Träger: Funktionalitäten page', () => {
    beforeEach(() => {
        mocks.roles = [];
        mocks.isSuperAdmin = true;
        mocks.multitenancyWithSingleDomainEnabled = false;
    });

    it('renders the shared raster grid for the Träger in the route', () => {
        render(<TenantAppSettings />);

        expect(gridProps().tenantId).toBe('7');
    });

    // The platform admin sees every part of the Träger's functionalities, also under single domain
    // (where the Träger admin sees the topics switch, too).
    it.each([false, true])('hides nothing with multitenancyWithSingleDomainEnabled=%s', (enabled) => {
        mocks.multitenancyWithSingleDomainEnabled = enabled;
        render(<TenantAppSettings />);

        expect(gridProps()).toEqual({ tenantId: '7' });
    });

    it('renders nothing for a user who is neither platform nor Träger admin', () => {
        mocks.isSuperAdmin = false;
        render(<TenantAppSettings />);

        expect(screen.queryByTestId('grid')).toBeNull();
    });
});
