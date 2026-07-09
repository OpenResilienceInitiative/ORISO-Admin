import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import getAgencyDataById from '../api/agency/getAgencyById';
import { AgencyData } from '../types/agency';

interface AgencyProps extends Omit<UseQueryOptions<AgencyData>, 'queryKey' | 'queryFn'> {
    id?: string;
}
export const useAgencyData = ({ id, ...options }: AgencyProps) => {
    return useQuery<AgencyData>({
        queryKey: ['AGENCY', id],
        queryFn: () => getAgencyDataById(id).then(({ _embedded }) => _embedded),
        ...options,
        enabled: id !== 'add',
    });
};
