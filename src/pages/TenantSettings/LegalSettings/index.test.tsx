import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    tenantId: 0 as number | string | undefined,
    loadedTenantId: 1 as number | undefined,
    legalSettingsProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({ tenantId: mocks.tenantId }),
}));

vi.mock('../../../hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ data: mocks.loadedTenantId === undefined ? undefined : { id: mocks.loadedTenantId } }),
}));

vi.mock('../../../components/Tenants/LegalSettings', () => ({
    LegalSettings: (props: Record<string, unknown>) => {
        mocks.legalSettingsProps.push(props);
        return null;
    },
}));

import { LegalSettingsPage } from './index';

const lastProps = () => mocks.legalSettingsProps[mocks.legalSettingsProps.length - 1];

describe('LegalSettingsPage — which tenant the platform legal texts belong to', () => {
    beforeEach(() => {
        mocks.legalSettingsProps.length = 0;
    });

    it('publishes the platform text on the loaded main tenant, but keeps the platform draft on tenant 0', () => {
        // A platform administrator's token carries tenant 0. Tenant 0 has no tenant row, so the
        // published imprint and privacy policy — the ones help-seekers are served — live on the main
        // tenant that is loaded for this domain. The server-side platform DRAFT, however, is owned by
        // tenant 0 by design in TenantService. Collapsing both onto 0 sent every read and every
        // publish to /tenantadmin/0, which answers 404: the platform admin could not publish at all.
        mocks.tenantId = 0;
        mocks.loadedTenantId = 1;

        render(<LegalSettingsPage />);

        expect(lastProps().tenantId).toBe(1);
        expect(lastProps().draftTenantId).toBe('0');
    });

    it('uses the Träger own tenant for both the published text and the draft', () => {
        mocks.tenantId = 7;
        mocks.loadedTenantId = 1;

        render(<LegalSettingsPage />);

        expect(lastProps().tenantId).toBe(7);
        expect(lastProps().draftTenantId).toBe('7');
    });
});
