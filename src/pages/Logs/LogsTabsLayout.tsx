import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../components/Page';
import { AdminSegmentedTabs, AdminSegmentedTabItem } from '../../components/AdminSegmentedTabs/AdminSegmentedTabs';
import routePathNames from '../../appConfig';
import { ReactComponent as PowerOffIcon } from '../../resources/img/svg/power_off.svg';
import { ReactComponent as FaceNodIcon } from '../../resources/img/svg/face_nod.svg';

interface LogsTabsLayoutProps {
    /** Inactive-account audit is super-admin only. */
    showInactive: boolean;
    /** Case-handover audit requires the case-handover admin permission. */
    showCaseHandover: boolean;
}

/**
 * Unifies the two activity-log views under a single "Logs" entry: one page with
 * URL-driven tabs ("Inactive" first/default, then "Case handover"). Only the tabs
 * the current admin may access are rendered; the child route renders in the Outlet.
 */
export const LogsTabsLayout = ({ showInactive, showCaseHandover }: LogsTabsLayoutProps) => {
    const { t } = useTranslation();

    const tabs: AdminSegmentedTabItem[] = [];
    if (showInactive) {
        tabs.push({
            id: 'inactive',
            label: t('sidebar.inactiveAudit', String(t('inactiveAudit.title'))),
            icon: <PowerOffIcon />,
            to: routePathNames.inactiveAccountAuditLogs,
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
