import * as React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import routePathNames from '../../../appConfig';

/**
 * #854: the bare `/admin/agency/:id` route rendered the same page as
 * `/admin/agency/:id/general`, but the Stammdaten tab's `to` only matches the
 * `/general` path — Page.BackWithActions' active-tab check is `pathname ===
 * tab.to || pathname.startsWith(`${tab.to}/`)`, which never matches a SHORTER
 * pathname than the tab's `to`. Opening an agency from the list therefore
 * landed with no tab visibly active. Canonicalize to `/general` instead of
 * teaching the shared tab-matching logic a second equivalent path.
 */
export const AgencyDefaultSectionRedirect = () => {
    const { id } = useParams();

    return <Navigate to={`${routePathNames.agency}/${id}/general`} replace />;
};
