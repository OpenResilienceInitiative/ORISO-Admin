import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import { AdminSegmentedTabs, AdminSegmentedTabItem } from '../../components/AdminSegmentedTabs/AdminSegmentedTabs';
import { useRegisterMobileNav } from '../../components/AdminMobileNav/MobileNavContext';
import { useIsDesktopLayout } from '../../hooks/useIsDesktopLayout.hook';
import routePathNames from '../../appConfig';
import { ReactComponent as PowerOffIcon } from '../../resources/img/svg/power_off.svg';
import { ReactComponent as FaceNodIcon } from '../../resources/img/svg/face_nod.svg';
import { ReactComponent as PersonSearchIcon } from '../../resources/img/svg/person_search_filled.svg';

interface LogsTabsLayoutProps {
    /** Supervision audit — every admin with consultant read except the platform admin. */
    showSupervisor: boolean;
    /** Case-handover audit requires the case-handover admin permission. */
    showCaseHandover: boolean;
    /** Inactive-account audit is super-admin only. */
    showInactive: boolean;
}

/**
 * The single "Logs" section: one page, URL-driven tabs, and only the tabs the current admin may
 * access. Every role — platform admin, Träger admin, Beratungsstellen-Admin — gets the same shape;
 * splitting these views over separate nav entries is what made the menu look duplicated
 * (ORISO-Admin#84). The child route renders in the Outlet.
 */
export const LogsTabsLayout = ({ showSupervisor, showCaseHandover, showInactive }: LogsTabsLayoutProps) => {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const isDesktopLayout = useIsDesktopLayout();

    const tabs: AdminSegmentedTabItem[] = [];
    if (showSupervisor) {
        tabs.push({
            id: 'supervisors',
            label: t('sidebar.supervisorLogs', String(t('logs.supervisors.subTitle'))),
            icon: <PersonSearchIcon />,
            to: routePathNames.logs,
            // `/admin/logs` is a prefix of every sibling tab route — without an exact match the
            // supervision tab would stay highlighted on the case-handover and inactive tabs.
            end: true,
        });
    }
    if (showCaseHandover) {
        tabs.push({
            id: 'case-handover',
            label: t('sidebar.caseHandoverLogs', String(t('caseHandoverLogs.title'))),
            icon: <FaceNodIcon />,
            to: routePathNames.caseHandoverLogs,
        });
    }
    if (showInactive) {
        tabs.push({
            id: 'inactive',
            label: t('sidebar.inactiveAudit', String(t('inactiveAudit.title'))),
            icon: <PowerOffIcon />,
            to: routePathNames.inactiveAccountAuditLogs,
        });
    }

    const navigableTabs = tabs.filter((tab) => tab.to);

    const activeSubsectionKey = useMemo(() => {
        // Honour `end: true` on the supervision landing so `/admin/logs` does
        // not stay active on every sibling under that prefix.
        const matches = navigableTabs.filter((tab) => {
            if (!tab.to) {
                return false;
            }
            if (tab.end) {
                return pathname === tab.to;
            }
            return pathname === tab.to || pathname.startsWith(`${tab.to}/`);
        });

        return matches.sort((a, b) => (b.to?.length ?? 0) - (a.to?.length ?? 0))[0]?.to;
    }, [navigableTabs, pathname]);

    useRegisterMobileNav(
        'logs-sections',
        navigableTabs.length > 1
            ? {
                  subsections: navigableTabs.map((tab) => ({
                      key: tab.to as string,
                      label: tab.label,
                      to: tab.to,
                  })),
                  activeSubsectionKey,
              }
            : null,
    );

    return (
        <Page>
            {tabs.length > 0 && isDesktopLayout && (
                <Page.Title>
                    <AdminSegmentedTabs ariaLabel={String(t('logs.title'))} items={tabs} />
                </Page.Title>
            )}
            <Outlet />
        </Page>
    );
};

export default LogsTabsLayout;
