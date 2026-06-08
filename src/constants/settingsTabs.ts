import routePathNames from '../appConfig';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';

export type SettingsTab = {
    to: string;
    titleKey: string;
};

type SettingsTabsContext = {
    isSuperAdmin: boolean;
    shouldShowThemeSettings: boolean;
    can: (action: PermissionAction | PermissionAction[], resource: Resource) => boolean;
    isTenantSettingsEditEnabled: boolean;
    multitenancyWithSingleDomainEnabled: boolean;
};

const compactTabs = (tabs: Array<SettingsTab | false | null | undefined>): SettingsTab[] =>
    tabs.filter(Boolean) as SettingsTab[];

export const getSettingsTabs = ({
    isSuperAdmin,
    shouldShowThemeSettings,
    can,
    isTenantSettingsEditEnabled,
    multitenancyWithSingleDomainEnabled,
}: SettingsTabsContext): SettingsTab[] => {
    const base = routePathNames.themeSettings;

    if (isSuperAdmin) {
        return compactTabs([
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/global-config`,
                titleKey: 'settings.subhead.globalConfig',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/general`,
                titleKey: 'settings.subhead.view',
            },
            (can(PermissionAction.Read, Resource.LegalText) || can(PermissionAction.Update, Resource.LegalText)) && {
                to: `${base}/legal`,
                titleKey: 'settings.subhead.legal',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/smtp`,
                titleKey: 'settings.subhead.smtp',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/permissions`,
                titleKey: 'settings.subhead.functionAccess',
            },
        ]);
    }

    // Tenant / Träger settings tab order (P1). Appearance shares the general route until split.
    return compactTabs([
        shouldShowThemeSettings &&
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/general`,
                titleKey: 'settings.subhead.masterData',
            },
        (can(PermissionAction.Read, Resource.LegalText) || can(PermissionAction.Update, Resource.LegalText)) && {
            to: `${base}/legal`,
            titleKey: 'settings.subhead.legal',
        },
        can(PermissionAction.Update, Resource.Tenant) && {
            to: `${base}/smtp`,
            titleKey: 'settings.subhead.smtp',
        },
        can(PermissionAction.Update, Resource.Tenant) &&
            isTenantSettingsEditEnabled && {
                to: `${base}/app-settings`,
                titleKey: `tenants.edit.tabs.${multitenancyWithSingleDomainEnabled ? 'globalSettings' : 'appSettings'}`,
            },
        can(PermissionAction.Update, Resource.Tenant) && {
            to: `${base}/permissions`,
            titleKey: 'settings.subhead.functionAccess',
        },
    ]);
};

export const getDefaultSettingsPath = (ctx: SettingsTabsContext): string => {
    const tabs = getSettingsTabs(ctx);
    return tabs[0]?.to ?? `${routePathNames.themeSettings}/legal`;
};
