import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { UserRole } from '../../../enums/UserRole';

const mocks = vi.hoisted(() => ({
    roles: [] as string[],
    tenantId: 5 as number | null,
    multitenancyWithSingleDomainEnabled: false,
}));

vi.mock('../../../components/Tenants/AppSettings/FunctionalitiesGrid', () => ({
    FunctionalitiesGrid: (props: Record<string, unknown>) => <div data-testid="grid">{JSON.stringify(props)}</div>,
}));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({
        settings: { multitenancyWithSingleDomainEnabled: mocks.multitenancyWithSingleDomainEnabled },
    }),
}));
vi.mock('../../../hooks/useTenantData.hook', () => ({ useTenantData: () => ({ data: { id: 9 } }) }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        hasRole: (role: string) => mocks.roles.includes(role),
        tenantId: mocks.tenantId,
    }),
}));

// eslint-disable-next-line import/first
import { AppSettingsPage } from './index';

const gridProps = () => JSON.parse(screen.getByTestId('grid').textContent ?? '{}');

describe('Träger admin Funktionalitäten page', () => {
    beforeEach(() => {
        mocks.roles = [UserRole.TenantAdmin];
        mocks.tenantId = 5;
        mocks.multitenancyWithSingleDomainEnabled = false;
    });

    it('renders the shared raster grid with the Träger level flags', () => {
        render(<AppSettingsPage />);

        // The SMTP tile lives on the Email Server tab only; it is not repeated here.
        expect(gridProps()).toEqual({ tenantId: '5', hideSmtp: true, hideGroupChatToggle: true });
    });

    it('falls back to the loaded tenant when the token carries no usable tenant id', () => {
        mocks.tenantId = 0;
        render(<AppSettingsPage />);

        expect(gridProps().tenantId).toBe('9');
    });

    it('keeps the single-domain variant: only the other-functions tile, without statistics and group chat', () => {
        mocks.multitenancyWithSingleDomainEnabled = true;
        render(<AppSettingsPage />);

        expect(gridProps()).toEqual({
            tenantId: '5',
            hideSmtp: true,
            hideCommunication: true,
            hideTopicsCard: true,
            hideStatistics: true,
            hideGroupChatToggle: true,
        });
    });

    it('renders nothing for a user who is not a Träger admin', () => {
        mocks.roles = [];
        render(<AppSettingsPage />);

        expect(screen.queryByTestId('grid')).toBeNull();
    });
});
