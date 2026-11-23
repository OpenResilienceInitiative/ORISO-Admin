import { describe, expect, it, vi } from 'vite-plus/test';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';
import { getDefaultSettingsPath, getSettingsTabs } from './settingsTabs';

vi.mock('../appConfig', () => ({
    default: {
        themeSettings: '/settings',
        serviceNotices: '/settings/service-notices',
    },
}));

const baseContext = {
    isSuperAdmin: false,
    shouldShowThemeSettings: true,
    can: vi.fn(() => true),
    isTenantSettingsEditEnabled: true,
};

describe('settings tabs', () => {
    it('exposes service notices only with the explicit platform-operator capability', () => {
        expect(getSettingsTabs({ ...baseContext, isSuperAdmin: true, canManageServiceNotices: true })).toContainEqual({
            to: '/settings/service-notices',
            titleKey: 'serviceNotices.title',
            iconName: 'email_server',
        });
        expect(
            getSettingsTabs({ ...baseContext, isSuperAdmin: true, canManageServiceNotices: false }).some(
                (tab) => tab.titleKey === 'serviceNotices.title',
            ),
        ).toBe(false);
        expect(
            getSettingsTabs({ ...baseContext, isSuperAdmin: false, canManageServiceNotices: true }).some(
                (tab) => tab.titleKey === 'serviceNotices.title',
            ),
        ).toBe(false);
    });
    it('returns all super-admin tabs when permissions allow them', () => {
        const tabs = getSettingsTabs({
            ...baseContext,
            isSuperAdmin: true,
        });

        expect(tabs.map((tab) => tab.to)).toEqual([
            '/settings/global-config',
            '/settings/master-data',
            '/settings/general',
            '/settings/topics',
            '/settings/greeting',
            '/settings/legal',
            '/settings/smtp',
            '/settings/permissions',
        ]);
    });

    // Every installation ships the Caritas default topics; the platform admin overrides them here.
    it('gives the platform admin a Themen tab, and nobody else', () => {
        const topicsTab = { to: '/settings/topics', titleKey: 'settings.subhead.topics', iconName: 'topics' };
        expect(getSettingsTabs({ ...baseContext, isSuperAdmin: true })).toContainEqual(topicsTab);
        expect(getSettingsTabs(baseContext)).not.toContainEqual(topicsTab);
        const withoutTopicRight = vi.fn(
            (_action: PermissionAction | PermissionAction[], resource: Resource) => resource !== Resource.Topic,
        );
        expect(getSettingsTabs({ ...baseContext, isSuperAdmin: true, can: withoutTopicRight })).not.toContainEqual(
            topicsTab,
        );
    });

    // The platform admin overrides the built-in Caritas Erstantwort texts here (ADR-018 §6).
    it('offers the platform-level greeting tab only to the super admin', () => {
        expect(getSettingsTabs({ ...baseContext, isSuperAdmin: true })).toContainEqual({
            to: '/settings/greeting',
            titleKey: 'settings.subhead.greeting',
            iconName: 'erstantwort',
        });
        expect(getSettingsTabs(baseContext).some((tab) => tab.to === '/settings/greeting')).toBe(false);
    });

    // Figma Admin.ORISO node 465-27854 ("Subsection Translations German"), level 2:
    // Stammdaten & Mehr · Erscheinungsbild · Rechtliches · Email Server · Funktionszugriff.
    // Erstantwort (ADR-018, #601) is not part of that design; it sits after Rechtliches.
    it('gives the tenant level the designed tab order including Erscheinungsbild', () => {
        const tabs = getSettingsTabs(baseContext);

        expect(tabs.map((tab) => ({ to: tab.to, titleKey: tab.titleKey }))).toEqual([
            { to: '/settings/master-data', titleKey: 'settings.subhead.masterData' },
            { to: '/settings/general', titleKey: 'settings.subhead.view' },
            { to: '/settings/legal', titleKey: 'settings.subhead.legal' },
            { to: '/settings/erstantwort', titleKey: 'settings.subhead.erstantwort' },
            { to: '/settings/smtp', titleKey: 'settings.subhead.smtp' },
            { to: '/settings/permissions', titleKey: 'settings.subhead.functionAccess' },
            // Not part of the design: "Weitere" (topics, counsellor statistics). Tracked in #58.
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

        expect(tabs.map((tab) => tab.to)).toEqual(['/settings/erstantwort', '/settings/smtp', '/settings/permissions']);
    });

    it('offers the Erstantwort texts to a Träger that may update the tenant', () => {
        const tabs = getSettingsTabs(baseContext);

        expect(tabs).toContainEqual({
            to: '/settings/erstantwort',
            titleKey: 'settings.subhead.erstantwort',
            iconName: 'erstantwort',
        });
    });

    it('hides the Erstantwort texts from a Träger that may only read the tenant', () => {
        const can = vi.fn((action: PermissionAction | PermissionAction[]) => action === PermissionAction.Read);

        expect(getSettingsTabs({ ...baseContext, can }).some((tab) => tab.to.endsWith('/erstantwort'))).toBe(false);
    });

    // ORISO-Admin#1577 (Frank, 2026-11-19): the tab is called "Weitere" on every domain; the route stays.
    it('names the app-settings tab "Weitere" with one key and icon', () => {
        expect(getSettingsTabs(baseContext)).toContainEqual({
            to: '/settings/app-settings',
            titleKey: 'tenants.edit.tabs.appSettings',
            iconName: 'functionalities',
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
