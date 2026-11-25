import { Navigate, useParams } from 'react-router-dom';
import routePathNames from '../../../appConfig';

/**
 * `/admin/tenants/:id/app-settings` was the tab labelled "Email Server" and held the mail server
 * and the functionality tiles together. The tiles moved to `functionalities`; the old URL goes to
 * the Email Server tab it was named after.
 */
export const LegacyAppSettingsRedirect = () => {
    const { id } = useParams<{ id: string }>();

    return <Navigate to={`${routePathNames.tenants}/${id}/smtp`} replace />;
};
