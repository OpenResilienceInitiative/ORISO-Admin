import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantErstantwortSettings } from './index';

const mocks = vi.hoisted(() => ({ canUpdateTenant: true }));

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '7' }) }));
vi.mock('../../../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({ can: () => mocks.canUpdateTenant }),
}));
vi.mock('../../../../components/Tenants/AppSettings/ErstantwortSettings', () => ({
    ErstantwortSettings: ({ tenantId, readOnly }: { tenantId: string; readOnly?: boolean }) => (
        <div data-testid="erstantwort" data-tenant={tenantId} data-readonly={String(Boolean(readOnly))} />
    ),
}));

describe('Träger edit: Erstantwort tab (#1312)', () => {
    beforeEach(() => {
        mocks.canUpdateTenant = true;
    });

    it('edits the Träger named in the route, not the signed-in admin own tenant', () => {
        render(<TenantErstantwortSettings />);

        expect(screen.getByTestId('erstantwort')).toHaveAttribute('data-tenant', '7');
        expect(screen.getByTestId('erstantwort')).toHaveAttribute('data-readonly', 'false');
    });

    it('stays read-only without the update permission', () => {
        mocks.canUpdateTenant = false;
        render(<TenantErstantwortSettings />);

        expect(screen.getByTestId('erstantwort')).toHaveAttribute('data-readonly', 'true');
    });
});
