import { useQuery } from '@tanstack/react-query';
import { getAgencyAdminControls } from '../api/agency/getAgencyAdminControls';

export const AGENCY_ADMIN_CONTROLS_KEY = 'agency-admin-controls';

export const useAgencyAdminControls = (enabled = true) =>
    useQuery({
        queryKey: [AGENCY_ADMIN_CONTROLS_KEY],
        queryFn: getAgencyAdminControls,
        enabled,
        staleTime: 60_000,
    });
