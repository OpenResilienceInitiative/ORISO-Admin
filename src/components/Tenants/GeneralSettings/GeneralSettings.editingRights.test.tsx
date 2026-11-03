import { ReactNode } from 'react';
import { notification } from 'antd';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { GeneralSettings } from './index';
import { getTenantAdminControls } from '../../../api/tenant/getTenantAdminControls';
import { getTenantPermissionPolicies } from '../../../api/tenant/tenantPermissionPolicies';
import { updateTenantAdminControls } from '../../../api/tenant/updateTenantAdminControls';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import type { TenantAdminControls } from '../../../types/TenantAdminControls';
import type { TenantPermissionPolicies } from '../../../types/permissionPolicy';

/**
 * ORISO-Admin#1339: the "organisation admins may edit appearance" switch lives in the tenant
 * service (`PUT /tenantadmin/controls`, `permissionPolicies.appearance`), where the server checks
 * the lock. It must not be kept in the browser or in the server settings.
 */
// Some components destructure `[t]`, others `{ t }`: answer both shapes.
vi.mock('react-i18next', () => ({
    useTranslation: () => Object.assign([(key: string) => key], { t: (key: string) => key }),
}));
vi.mock('../../../api/tenant/getTenantAdminControls');
vi.mock('../../../api/tenant/updateTenantAdminControls');
vi.mock('../../../api/tenant/tenantPermissionPolicies');
vi.mock('../../../hooks/useSettingsAdminMutation.hook');
vi.mock('../../../hooks/useUserRoles.hook');
vi.mock('../../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
const ownTenant = vi.hoisted(() => ({ id: 7 as number | undefined }));
vi.mock('../../../hooks/useTenantData.hook', () => ({
    useTenantData: () => ({ data: { id: ownTenant.id, settings: {} } }),
}));
vi.mock('../../../context/useAppConfig', () => ({
    useAppConfigContext: () => ({ settings: {}, setManualSettings: vi.fn(), setServerSettings: vi.fn() }),
}));

// The cards below the switch are not under test; they only report whether they were told to be read-only.
vi.mock('./components/LogoAndFavicon', () => ({
    LogoAndFavicon: ({ readOnly }: { readOnly?: boolean }) => <output data-testid="logo" data-readonly={!!readOnly} />,
}));
vi.mock('./components/AssistantIdentity', () => ({
    AssistantIdentity: ({ readOnly }: { readOnly?: boolean }) => (
        <output data-testid="assistant" data-readonly={!!readOnly} />
    ),
}));
vi.mock('./components/Languages', () => ({
    Languages: ({ readOnly }: { readOnly?: boolean }) => <output data-testid="languages" data-readonly={!!readOnly} />,
}));
vi.mock('./components/ThemeBuilder', () => ({
    ThemeBuilder: ({ readOnly }: { readOnly?: boolean }) => <output data-testid="theme" data-readonly={!!readOnly} />,
}));
vi.mock('./components/NameAndSlogan', () => ({
    NameAndSlogan: ({ readOnly }: { readOnly?: boolean }) => <output data-testid="name" data-readonly={!!readOnly} />,
}));
vi.mock('./components/TypeOfLanguage', () => ({
    TypeOfLanguage: ({ readOnly }: { readOnly?: boolean }) => (
        <output data-testid="language-type" data-readonly={!!readOnly} />
    ),
}));

const PLATFORM_ADMIN_ROLES = { isSuperAdmin: true } as ReturnType<typeof useUserRoles>;
const ORGANISATION_ADMIN_ROLES = { isSuperAdmin: false } as ReturnType<typeof useUserRoles>;

const unlockedControls: TenantAdminControls = {
    permissionsPageEnabled: true,
    allowedPermissionToggles: { appearance: true, calls: false },
    permissionPolicies: { featureCallsEnabled: { value: false, mode: 'SUGGESTED' } },
};
const lockedControls: TenantAdminControls = {
    ...unlockedControls,
    allowedPermissionToggles: { appearance: false, calls: false },
    permissionPolicies: {
        ...unlockedControls.permissionPolicies,
        appearance: { value: false, mode: 'ENFORCED' },
    },
};
const tenantPolicies = (appearance?: { value: boolean; mode: 'ENFORCED' | 'SUGGESTED' }): TenantPermissionPolicies => ({
    tenantId: 7,
    policies: appearance ? { appearance } : {},
});

const renderPage = (section: 'masterData' | 'appearance' = 'masterData', tenantId = '7') => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return render(<GeneralSettings tenantId={tenantId} section={section} />, { wrapper });
};

const switchLabel = 'settings.masterData.editable.toggle';

describe('GeneralSettings editing-rights switch (ORISO-Admin#1339)', () => {
    const updateSettings = vi.fn();
    let localStorageWrites: string[];

    beforeEach(() => {
        vi.clearAllMocks();
        ownTenant.id = 7;
        localStorageWrites = [];
        const realSetItem = Storage.prototype.setItem;
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(
            this: Storage,
            key: string,
            value: string,
        ) {
            localStorageWrites.push(key);
            return realSetItem.call(this, key, value);
        });
        vi.mocked(useSettingsAdminMutation).mockReturnValue({ mutate: updateSettings } as never);
        vi.mocked(useUserRoles).mockReturnValue(PLATFORM_ADMIN_ROLES);
        vi.mocked(getTenantAdminControls).mockResolvedValue(unlockedControls);
        vi.mocked(getTenantPermissionPolicies).mockResolvedValue(tenantPolicies());
        vi.mocked(updateTenantAdminControls).mockImplementation(async (body) => body);
    });

    afterEach(() => {
        window.localStorage.clear();
        vi.restoreAllMocks();
    });

    const toggleAndSave = async () => {
        const user = userEvent.setup();
        await user.click(await screen.findByRole('button', { name: 'edit' }));
        await user.click(screen.getByRole('switch', { name: switchLabel }));
        await user.click(screen.getByRole('button', { name: 'card.edit.save' }));
    };

    it('writes switching it off as an enforced policy to the tenant service, keeping the other controls', async () => {
        renderPage();

        await toggleAndSave();

        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(1));
        const body = vi.mocked(updateTenantAdminControls).mock.calls[0][0];
        expect(body.permissionPolicies).toEqual({
            featureCallsEnabled: { value: false, mode: 'SUGGESTED' },
            appearance: { value: false, mode: 'ENFORCED' },
        });
        expect(body.permissionsPageEnabled).toBe(true);
        expect(body.allowedPermissionToggles).toMatchObject({ calls: false });
    });

    it('writes the reverse when it is switched on again', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue(lockedControls);
        renderPage();

        await toggleAndSave();

        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(1));
        const body = vi.mocked(updateTenantAdminControls).mock.calls[0][0];
        expect(body.permissionPolicies?.appearance).toEqual({ value: true, mode: 'ENFORCED' });
        expect(body.allowedPermissionToggles?.appearance).toBe(true);
    });

    it('keeps the choice out of the browser and out of the server settings', async () => {
        renderPage();

        await toggleAndSave();

        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(1));
        expect(updateSettings).not.toHaveBeenCalled();
        expect(localStorageWrites.filter((key) => key.includes('appearance'))).toEqual([]);
        expect(window.localStorage.getItem('oriso:tenantAdminControls.allowedPermissionToggles.appearance')).toBeNull();
    });

    it('ignores a value an earlier version left in the browser and shows what the server holds', async () => {
        window.localStorage.setItem('oriso:tenantAdminControls.allowedPermissionToggles.appearance', 'false');
        vi.mocked(useUserRoles).mockReturnValue(ORGANISATION_ADMIN_ROLES);
        vi.mocked(getTenantPermissionPolicies).mockResolvedValue(tenantPolicies({ value: true, mode: 'ENFORCED' }));
        renderPage();

        await waitFor(() => expect(getTenantPermissionPolicies).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'false'));
    });

    it('reads the switch back from the tenant service for another browser', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue(lockedControls);
        renderPage();

        const toggle = await screen.findByRole('switch', { name: switchLabel });
        await waitFor(() => expect(toggle).not.toBeChecked());
    });

    /** Waits for the tenant service's answer and lets React apply it, so the result is not the loading state. */
    const settledAfterPolicies = async () => {
        await waitFor(() => expect(getTenantPermissionPolicies).toHaveBeenCalledWith('7', { silent: true }));
        await Promise.allSettled(vi.mocked(getTenantPermissionPolicies).mock.results.map((result) => result.value));
        await act(async () => {});
    };

    it('shows the cards read-only to an organisation admin once the tenant service says locked', async () => {
        vi.mocked(useUserRoles).mockReturnValue(ORGANISATION_ADMIN_ROLES);
        vi.mocked(getTenantPermissionPolicies).mockResolvedValue(tenantPolicies({ value: false, mode: 'ENFORCED' }));
        renderPage();

        await settledAfterPolicies();

        expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'true');
        expect(screen.getByTestId('language-type')).toHaveAttribute('data-readonly', 'true');
        expect(getTenantAdminControls).not.toHaveBeenCalled();
    });

    it('makes the cards editable for an organisation admin only once the tenant service says allowed', async () => {
        vi.mocked(useUserRoles).mockReturnValue(ORGANISATION_ADMIN_ROLES);
        vi.mocked(getTenantPermissionPolicies).mockResolvedValue(tenantPolicies({ value: true, mode: 'ENFORCED' }));
        renderPage();

        expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'true');
        await waitFor(() => expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'false'));
    });

    it('keeps the cards read-only when the tenant service cannot be read', async () => {
        vi.mocked(useUserRoles).mockReturnValue(ORGANISATION_ADMIN_ROLES);
        vi.mocked(getTenantPermissionPolicies).mockRejectedValue(new Error('503'));
        renderPage();

        await settledAfterPolicies();

        expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'true');
        expect(screen.getByTestId('language-type')).toHaveAttribute('data-readonly', 'true');
    });

    it('keeps the cards read-only when the tenant service sends no value for the switch', async () => {
        vi.mocked(useUserRoles).mockReturnValue(ORGANISATION_ADMIN_ROLES);
        vi.mocked(getTenantPermissionPolicies).mockResolvedValue(tenantPolicies());
        renderPage();

        await settledAfterPolicies();

        expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'true');
    });

    it('keeps the cards read-only and asks nothing when the organisation is unknown', async () => {
        vi.mocked(useUserRoles).mockReturnValue(ORGANISATION_ADMIN_ROLES);
        ownTenant.id = undefined;
        renderPage('masterData', '');

        await act(async () => {});

        expect(getTenantPermissionPolicies).not.toHaveBeenCalled();
        expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'true');
    });

    it('shows the platform value, not the old toggle, when the two disagree', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue({
            ...unlockedControls,
            allowedPermissionToggles: { appearance: true },
            permissionPolicies: { appearance: { value: false, mode: 'ENFORCED' } },
        });
        const { unmount } = renderPage();
        await waitFor(() => expect(screen.getByRole('switch', { name: switchLabel })).not.toBeChecked());
        unmount();

        vi.mocked(getTenantAdminControls).mockResolvedValue({
            ...unlockedControls,
            allowedPermissionToggles: { appearance: false },
            permissionPolicies: { appearance: { value: true, mode: 'ENFORCED' } },
        });
        renderPage();
        await waitFor(() => expect(screen.getByRole('switch', { name: switchLabel })).toBeChecked());
    });

    it('does not show the switch as on, nor let it be edited, when the platform controls cannot be read', async () => {
        vi.mocked(getTenantAdminControls).mockRejectedValue(new Error('503'));
        renderPage();

        await waitFor(() => expect(getTenantAdminControls).toHaveBeenCalled());
        await act(async () => {});

        expect(screen.getByRole('switch', { name: switchLabel })).not.toBeChecked();
        expect(screen.queryByRole('button', { name: 'edit' })).not.toBeInTheDocument();
    });

    it('does not send an inherited group-chat scope back as an override, but keeps a stored one', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue({
            ...unlockedControls,
            internalGroupChat: { recipientScope: { value: 'TENANT', mode: 'SUGGESTED', inherited: true } },
        });
        const { unmount } = renderPage();
        await toggleAndSave();
        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(1));
        expect(vi.mocked(updateTenantAdminControls).mock.calls[0][0]).not.toHaveProperty('internalGroupChat');
        unmount();

        vi.mocked(getTenantAdminControls).mockResolvedValue({
            ...unlockedControls,
            internalGroupChat: { recipientScope: { value: 'PLATFORM', mode: 'ENFORCED', inherited: false } },
        });
        renderPage();
        await toggleAndSave();
        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(2));
        expect(vi.mocked(updateTenantAdminControls).mock.calls[1][0].internalGroupChat).toEqual({
            recipientScope: { value: 'PLATFORM', mode: 'ENFORCED' },
        });
    });

    it('does not hand the platform admin a read-only card, even when locked', async () => {
        vi.mocked(getTenantAdminControls).mockResolvedValue(lockedControls);
        renderPage();

        await waitFor(() => expect(getTenantAdminControls).toHaveBeenCalled());
        expect(screen.getByTestId('name')).toHaveAttribute('data-readonly', 'false');
    });

    it('says so and keeps the card open when the tenant service refuses the save', async () => {
        vi.mocked(updateTenantAdminControls).mockRejectedValue(new Error('403'));
        const showError = vi.spyOn(notification, 'error').mockImplementation(() => undefined);
        renderPage();

        await toggleAndSave();

        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(showError).toHaveBeenCalledWith({ message: 'settings.masterData.editable.saveError' }),
        );
        expect(await screen.findByRole('button', { name: 'card.edit.save' })).toBeInTheDocument();
        expect(updateSettings).not.toHaveBeenCalled();
        expect(window.localStorage.getItem('oriso:tenantAdminControls.allowedPermissionToggles.appearance')).toBeNull();
    });

    it('shows one error, not two, when the request helper has already reported the failure', async () => {
        vi.mocked(updateTenantAdminControls).mockRejectedValue(new Error('CATCH_ALL'));
        const showError = vi.spyOn(notification, 'error').mockImplementation(() => undefined);
        renderPage();

        await toggleAndSave();

        await waitFor(() => expect(updateTenantAdminControls).toHaveBeenCalledTimes(1));
        expect(await screen.findByRole('button', { name: 'card.edit.save' })).toBeInTheDocument();
        expect(showError).not.toHaveBeenCalled();
    });
});
