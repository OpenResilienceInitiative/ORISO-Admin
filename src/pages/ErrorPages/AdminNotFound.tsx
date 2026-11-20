import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import routePathNames from '../../appConfig';
import { DashboardEmptyState } from '../../components/DashboardEmptyState/DashboardEmptyState';
import { ReactComponent as EmptyStateIcon } from '../../resources/img/svg/oriso/empty_state_96px.svg';

/**
 * Shown inside the Admin shell for an address no route answers (ORISO-Admin#1513). Before, the
 * content area stayed blank under the menu, so the admin could not tell what went wrong.
 */
export const AdminNotFound = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <DashboardEmptyState
            icon={<EmptyStateIcon />}
            title={t('errorPages.notFound.title')}
            description={t('errorPages.notFound.description')}
            action={{ label: t('toHomePage'), onClick: () => navigate(routePathNames.home) }}
        />
    );
};
