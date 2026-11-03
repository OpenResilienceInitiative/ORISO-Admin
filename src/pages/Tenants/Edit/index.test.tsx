import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TenantEditOrAdd } from './index';

const mocks = vi.hoisted(() => ({
    settings: {} as Record<string, unknown>,
    isSuperAdmin: true,
    tabs: undefined as Array<{ to: string; titleKey: string }> | undefined | false,
}));

vi.mock('react-router-dom', () => ({
    Outlet: () => null,
    useLocation: () => ({ search: '' }),
    useParams: () => ({ id: '7' }),
}));

vi.mock('../../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.BackWithActions = ({ tabs }: { tabs: typeof mocks.tabs }) => {
        mocks.tabs = tabs;
        return null;
    };
    return { Page };
});

vi.mock('../../../hooks/useSingleTenantData', () => ({
    useSingleTenantData: () => ({ data: { name: 'Träger' }, isLoading: false }),
}));
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../../hooks/useReleasesToggle.hook', () => ({ useReleasesToggle: () => ({ isEnabled: () => true }) }));
vi.mock('../../../hooks/useUserRoles.hook', () => ({ useUserRoles: () => ({ isSuperAdmin: mocks.isSuperAdmin }) }));
vi.mock('../../../context/useAppConfig', () => ({ useAppConfigContext: () => ({ settings: mocks.settings }) }));

const tabTargets = () => (mocks.tabs || []).filter(Boolean).map((tab) => tab.to);

describe('Träger edit page tabs (#134)', () => {
    beforeEach(() => {
        mocks.tabs = undefined;
        mocks.isSuperAdmin = true;
    });

    it.each([false, true])(
        'offers the Appearance (branding) tab with multitenancyWithSingleDomainEnabled=%s',
        (multitenancyWithSingleDomainEnabled) => {
            mocks.settings = { multitenancyWithSingleDomainEnabled };
            render(<TenantEditOrAdd />);

            expect(tabTargets()).toContain('/admin/tenants/7/theme-settings');
        },
    );

    it('keeps Appearance second, right after General', () => {
        mocks.settings = { multitenancyWithSingleDomainEnabled: true };
        render(<TenantEditOrAdd />);

        expect(tabTargets().slice(0, 2)).toEqual(['/admin/tenants/7/general', '/admin/tenants/7/theme-settings']);
    });

    // ORISO-Admin#1312: the Erstantwort tile lived only under the Träger admin's own settings, so a
    // platform admin editing a Träger had no way to reach it. Same place as in the settings menu:
    // after Rechtliches, before the mail server.
    it('offers the Erstantwort texts between Rechtliches and Email Server', () => {
        mocks.settings = { multitenancyWithSingleDomainEnabled: false };
        render(<TenantEditOrAdd />);

        expect(tabTargets()).toEqual([
            '/admin/tenants/7/general',
            '/admin/tenants/7/theme-settings',
            '/admin/tenants/7/legal-settings',
            '/admin/tenants/7/erstantwort',
            '/admin/tenants/7/app-settings',
            '/admin/tenants/7/global-settings',
        ]);
    });
});
