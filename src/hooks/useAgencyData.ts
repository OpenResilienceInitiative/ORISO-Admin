import { useQuery, UseQueryOptions } from 'react-query';
import getAgencyDataById from '../api/agency/getAgencyById';
import { AgencyData } from '../types/agency';

interface AgencyProps extends UseQueryOptions<AgencyData> {
    id?: string;
}
export const useAgencyData = ({ id, ...options }: AgencyProps) => {
    return useQuery<AgencyData>(['AGENCY', id], () => getAgencyDataById(id).then(({ _embedded }) => _embedded), {
        ...options,
        enabled: id !== 'add',
    });
};
