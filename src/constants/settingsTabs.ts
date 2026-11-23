import routePathNames from '../appConfig';
import { PermissionAction } from '../enums/PermissionAction';
import { Resource } from '../enums/Resource';

export type SettingsTab = {
    to: string;
    titleKey: string;
    iconName: string;
};

type SettingsTabsContext = {
    isSuperAdmin: boolean;
    canManageServiceNotices?: boolean;
    shouldShowThemeSettings: boolean;
    can: (action: PermissionAction | PermissionAction[], resource: Resource) => boolean;
    isTenantSettingsEditEnabled: boolean;
};

const compactTabs = (tabs: Array<SettingsTab | false | null | undefined>): SettingsTab[] =>
    tabs.filter(Boolean) as SettingsTab[];

export const getSettingsTabs = ({
    isSuperAdmin,
    canManageServiceNotices = false,
    shouldShowThemeSettings,
    can,
    isTenantSettingsEditEnabled,
}: SettingsTabsContext): SettingsTab[] => {
    const base = routePathNames.themeSettings;

    if (isSuperAdmin) {
        return compactTabs([
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/global-config`,
                titleKey: 'settings.subhead.globalConfig',
                iconName: 'global_config',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/master-data`,
                titleKey: 'settings.subhead.masterData',
                iconName: 'master_data',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/general`,
                titleKey: 'settings.subhead.view',
                iconName: 'appearance',
            },
            // The Caritas default topics ship with every installation; the platform admin overrides them here.
            can(PermissionAction.Update, Resource.Topic) && {
                to: `${base}/topics`,
                titleKey: 'settings.subhead.topics',
                iconName: 'topics',
            },
            (can(PermissionAction.Read, Resource.LegalText) || can(PermissionAction.Update, Resource.LegalText)) && {
                to: `${base}/legal`,
                titleKey: 'settings.subhead.legal',
                iconName: 'legal',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/smtp`,
                titleKey: 'settings.subhead.smtp',
                iconName: 'email_server',
            },
            canManageServiceNotices && {
                to: routePathNames.serviceNotices,
                titleKey: 'serviceNotices.title',
                iconName: 'email_server',
            },
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/permissions`,
                titleKey: 'settings.subhead.functionAccess',
                iconName: 'functionality_access',
            },
        ]);
    }

    // Tenant / Träger tab order per Figma Admin.ORISO node 465-27854, level 2:
    // Stammdaten & Mehr · Erscheinungsbild · Rechtliches · Email Server · Funktionszugriff.
    // `app-settings` ("Weitere", ORISO-Admin#1577: same name on every level and domain) is not in
    // the design but holds topics and counsellor statistics, so it trails the designed set (#58).
    return compactTabs([
        shouldShowThemeSettings &&
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/master-data`,
                titleKey: 'settings.subhead.masterData',
                iconName: 'master_data',
            },
        shouldShowThemeSettings &&
            can(PermissionAction.Update, Resource.Tenant) && {
                to: `${base}/general`,
                titleKey: 'settings.subhead.view',
                iconName: 'appearance',
            },
        (can(PermissionAction.Read, Resource.LegalText) || can(PermissionAction.Update, Resource.LegalText)) && {
            to: `${base}/legal`,
            titleKey: 'settings.subhead.legal',
            iconName: 'legal',
        },
        can(PermissionAction.Update, Resource.Tenant) && {
            to: `${base}/erstantwort`,
            titleKey: 'settings.subhead.erstantwort',
            iconName: 'erstantwort',
        },
        can(PermissionAction.Update, Resource.Tenant) && {
            to: `${base}/smtp`,
            titleKey: 'settings.subhead.smtp',
            iconName: 'email_server',
        },
        can(PermissionAction.Update, Resource.Tenant) && {
            to: `${base}/permissions`,
            titleKey: 'settings.subhead.functionAccess',
            iconName: 'functionality_access',
        },
        can(PermissionAction.Update, Resource.Tenant) &&
            isTenantSettingsEditEnabled && {
                to: `${base}/app-settings`,
                titleKey: 'tenants.edit.tabs.appSettings',
                iconName: 'functionalities',
            },
    ]);
};

export const getDefaultSettingsPath = (ctx: SettingsTabsContext): string => {
    const tabs = getSettingsTabs(ctx);
    return tabs[0]?.to ?? `${routePathNames.themeSettings}/legal`;
};
