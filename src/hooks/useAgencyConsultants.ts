import { useQuery } from '@tanstack/react-query';
import { AgencyConsultant, getAgencyConsultants } from '../api/agency/getAgencyConsultants';

export const AGENCY_CONSULTANTS_KEY = 'AGENCY_CONSULTANTS';

/** Counsellors assigned to a saved agency; idle for the create route. */
export const useAgencyConsultants = ({ id, enabled = true }: { id?: string; enabled?: boolean }) =>
    useQuery<AgencyConsultant[]>({
        queryKey: [AGENCY_CONSULTANTS_KEY, id],
        queryFn: () => getAgencyConsultants(id),
        enabled: enabled && !!id && id !== 'add',
    });
