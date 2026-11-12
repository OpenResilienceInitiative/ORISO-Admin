import { useMemo, useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import { AdminSegmentedTabs, type AdminSegmentedTabItem } from '../../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { useRegisterMobileNav } from '../../components/AdminMobileNav/MobileNavContext';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import { useUserRoles } from '../../hooks/useUserRoles.hook';
import { useTenantData } from '../../hooks/useTenantData.hook';
import routePathNames from '../../appConfig';
import decodeHTML from '../../utils/decodeHTML';
import { ADMIN_PAGE_SLOT, localizedText, type AddonApp, type AvailableAddon } from '../../addons/addonTypes';
import type { AddonTenant } from '../../addons/useAddonHostProps';
import { useAddonRegistry } from './useAddons';

export interface AddonsOutletContext {
    tenant: AddonTenant | null;
    setTenant: (tenant: AddonTenant | null) => void;
    isSuperAdmin: boolean;
    adminPages: AdminPageEntry[];
    registryLoading: boolean;
}

export interface AdminPageEntry {
    addon: AvailableAddon;
    app: AddonApp;
    to: string;
}

export const adminPagePath = (addonName: string, appId: string) =>
    `${routePathNames.addons}/apps/${encodeURIComponent(addonName)}/${encodeURIComponent(appId)}`;

export const adminPageEntries = (addons: AvailableAddon[]): AdminPageEntry[] =>
    addons.flatMap((addon) =>
        (addon.apps ?? [])
            .filter((app) => app.slots?.includes(ADMIN_PAGE_SLOT))
            .map((app) => ({ addon, app, to: adminPagePath(addon.name, app.id) })),
    );

export const useAddonsOutletContext = () => useOutletContext<AddonsOutletContext>();

/** The "Add-ons" section: an overview tab plus one tab per `admin.page` app the registry offers. */
export const AddonsLayout = () => {
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();
    const isDesktopLayout = useIsDesktopLayout();
    const { isSuperAdmin, tenantId } = useUserRoles();
    const { data: ownTenant } = useTenantData();
    const [selectedTenant, setSelectedTenant] = useState<AddonTenant | null>(null);
    const registry = useAddonRegistry();
    const language = i18n.resolvedLanguage || i18n.language || 'de';

    const tenant: AddonTenant | null = useMemo(() => {
        if (isSuperAdmin) {
            return selectedTenant;
        }
        const id = tenantId != null && tenantId > 0 ? tenantId : ownTenant?.id;
        return id != null ? { id: Number(id), name: ownTenant?.name ? decodeHTML(ownTenant.name) : undefined } : null;
    }, [isSuperAdmin, selectedTenant, tenantId, ownTenant?.id, ownTenant?.name]);

    const adminPages = useMemo(() => adminPageEntries(registry.data?.addons ?? []), [registry.data]);

    const tabs: AdminSegmentedTabItem[] = [
        { id: 'overview', label: String(t('addons.tabs.overview')), to: routePathNames.addons, end: true },
        ...adminPages.map((entry) => ({
            id: entry.to,
            label: localizedText(entry.app.title, language, entry.app.id),
            to: entry.to,
        })),
    ];

    const activeSubsectionKey = tabs
        .filter((tab) => tab.to && (tab.end ? pathname === tab.to : pathname.startsWith(tab.to)))
        .sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0]?.to;

    useRegisterMobileNav(
        'addons-sections',
        tabs.length > 1
            ? {
                  subsections: tabs.map((tab) => ({ key: tab.to as string, label: tab.label, to: tab.to })),
                  activeSubsectionKey,
              }
            : null,
    );

    const context: AddonsOutletContext = {
        tenant,
        setTenant: setSelectedTenant,
        isSuperAdmin,
        adminPages,
        registryLoading: registry.isLoading,
    };

    return (
        <Page>
            {tabs.length > 1 && isDesktopLayout && (
                <Page.Title>
                    <AdminSegmentedTabs ariaLabel={String(t('addons.title'))} items={tabs} />
                </Page.Title>
            )}
            <Outlet context={context} />
        </Page>
    );
};

export default AddonsLayout;
