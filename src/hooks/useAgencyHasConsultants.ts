import { useQuery, UseQueryOptions } from 'react-query';
import { hasAgencyConsultants } from '../api/agency/getAgencyConsultants';

interface AgencyHasConsultantsProps extends UseQueryOptions<boolean> {
    id?: string;
}

export const useAgencyHasConsultants = ({ id, ...options }: AgencyHasConsultantsProps) => {
    return useQuery<boolean>(['HAS_CONSULTANTS', id], () => hasAgencyConsultants(id), {
        enabled: id !== 'add',
        ...options,
    });
};
