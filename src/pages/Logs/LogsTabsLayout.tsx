import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import { AdminSegmentedTabs, AdminSegmentedTabItem } from '../../components/AdminSegmentedTabs/AdminSegmentedTabs';
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

    return (
        <Page>
            {tabs.length > 0 && (
                <Page.Title>
                    <AdminSegmentedTabs ariaLabel={String(t('logs.title'))} items={tabs} />
                </Page.Title>
            )}
            <Outlet />
        </Page>
    );
};

export default LogsTabsLayout;
