import { describe, expect, it, vi } from 'vitest';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { getDefaultSettingsPath, getSettingsTabs } from './settingsTabs';

vi.mock('../appConfig', () => ({
    default: {
        themeSettings: '/settings',
    },
}));

const baseContext = {
    isSuperAdmin: false,
    shouldShowThemeSettings: true,
    can: vi.fn(() => true),
    isTenantSettingsEditEnabled: true,
    multitenancyWithSingleDomainEnabled: false,
};

describe('settings tabs', () => {
    it('returns all super-admin tabs when permissions allow them', () => {
        const tabs = getSettingsTabs({
            ...baseContext,
            isSuperAdmin: true,
        });

        expect(tabs.map((tab) => tab.to)).toEqual([
            '/settings/global-config',
            '/settings/general',
            '/settings/legal',
            '/settings/smtp',
            '/settings/permissions',
        ]);
    });

    it('hides tenant tabs when the related permission or feature flag is disabled', () => {
        const can = vi.fn((action: PermissionAction | PermissionAction[], resource: Resource) => {
            if (resource === Resource.LegalText) {
                return false;
            }
            return action === PermissionAction.Update && resource === Resource.Tenant;
        });

        const tabs = getSettingsTabs({
            ...baseContext,
            can,
            shouldShowThemeSettings: false,
            isTenantSettingsEditEnabled: false,
        });

        expect(tabs.map((tab) => tab.to)).toEqual(['/settings/smtp', '/settings/permissions']);
    });

    it('uses the global settings label and icon for single-domain multitenancy', () => {
        const tabs = getSettingsTabs({
            ...baseContext,
            multitenancyWithSingleDomainEnabled: true,
        });

        expect(tabs).toContainEqual({
            to: '/settings/app-settings',
            titleKey: 'tenants.edit.tabs.globalSettings',
            iconName: 'global_settings',
        });
    });

    it('falls back to legal settings when no tabs are available', () => {
        const path = getDefaultSettingsPath({
            ...baseContext,
            shouldShowThemeSettings: false,
            can: vi.fn(() => false),
        });

        expect(path).toBe('/settings/legal');
    });
});
