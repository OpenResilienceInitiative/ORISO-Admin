import { useQuery } from 'react-query';
import { getAgencyAdminControls } from '../api/agency/getAgencyAdminControls';

export const AGENCY_ADMIN_CONTROLS_KEY = 'agency-admin-controls';

export const useAgencyAdminControls = (enabled = true) =>
    useQuery([AGENCY_ADMIN_CONTROLS_KEY], getAgencyAdminControls, {
        enabled,
        staleTime: 60_000,
    });
