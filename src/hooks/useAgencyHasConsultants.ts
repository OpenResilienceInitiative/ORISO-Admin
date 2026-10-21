import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { hasAgencyConsultants } from '../api/agency/getAgencyConsultants';

interface AgencyHasConsultantsProps extends Omit<UseQueryOptions<boolean>, 'queryKey' | 'queryFn'> {
    id?: string;
}

export const useAgencyHasConsultants = ({ id, enabled, ...options }: AgencyHasConsultantsProps) => {
    return useQuery<boolean>({
        queryKey: ['HAS_CONSULTANTS', id],
        queryFn: () => hasAgencyConsultants(id),
        ...options,
        enabled: !!id && id !== 'add' ? enabled : false,
    });
};
