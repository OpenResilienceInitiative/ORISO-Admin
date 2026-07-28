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
            '/settings/master-data',
            '/settings/general',
            '/settings/legal',
            '/settings/smtp',
            '/settings/permissions',
        ]);
    });

    // Figma Admin.ORISO node 465-27854 ("Subsection Translations German"), level 2:
    // Stammdaten & Mehr · Erscheinungsbild · Rechtliches · Email Server · Funktionszugriff.
    it('gives the tenant level the designed tab order including Erscheinungsbild', () => {
        const tabs = getSettingsTabs(baseContext);

        expect(tabs.map((tab) => ({ to: tab.to, titleKey: tab.titleKey }))).toEqual([
            { to: '/settings/master-data', titleKey: 'settings.subhead.masterData' },
            { to: '/settings/general', titleKey: 'settings.subhead.view' },
            { to: '/settings/legal', titleKey: 'settings.subhead.legal' },
            { to: '/settings/smtp', titleKey: 'settings.subhead.smtp' },
            { to: '/settings/permissions', titleKey: 'settings.subhead.functionAccess' },
            // Not part of the design; kept because it is the only entry point for the
            // tenant feature toggles. Tracked in #58.
            { to: '/settings/app-settings', titleKey: 'tenants.edit.tabs.appSettings' },
        ]);
    });

    it('keeps master data and appearance on separate routes', () => {
        const tabs = getSettingsTabs(baseContext);
        const routes = tabs.map((tab) => tab.to);

        expect(new Set(routes).size, `duplicate settings routes in ${routes.join(', ')}`).toBe(routes.length);
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
