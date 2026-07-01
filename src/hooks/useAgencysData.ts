import { QueryOptions, useQuery } from '@tanstack/react-query';
import getAgencyData from '../api/agency/getAgencyData';
import { AgencyData } from '../types/agency';
import { ResponseList } from '../types/ResponseList';

interface AgenciesDataProps extends QueryOptions<ResponseList<AgencyData>> {
    current?: number;
    sortBy?: string;
    order?: string;
    pageSize?: number;
    search?: string;
}

export const useAgenciesData = ({ current, sortBy, order, pageSize, search, ...options }: AgenciesDataProps) => {
    return useQuery({
        queryKey: ['AGENCIES', current, sortBy, order, pageSize, search],
        queryFn: () => getAgencyData({ current, sortBy, order, pageSize, search }),
        ...options,
    });
};
