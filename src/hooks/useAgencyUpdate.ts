import mergeWith from 'lodash.mergewith';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import addAgencyData from '../api/agency/addAgencyData';
import { updateAgencyData } from '../api/agency/updateAgencyData';
import { TypeOfUser } from '../enums/TypeOfUser';
import { AgencyData } from '../types/agency';
import { useAgencyData } from './useAgencyData';

export const useAgencyUpdate = (id: string) => {
    const queryClient = useQueryClient();
    const { data: agencyData } = useAgencyData({ id, enabled: id !== 'add' });
    return useMutation({
        mutationFn: (data: Partial<AgencyData>) => {
            if (id === 'add') {
                return addAgencyData(data);
            }
            const latestAgencyData = queryClient.getQueryData<AgencyData>(['AGENCY', id]) ?? agencyData;
            const mergedAgencyData = mergeWith({}, latestAgencyData, data, (objValue, srcValue) => {
                return objValue instanceof Array ? srcValue : undefined;
            }) as AgencyData;

            // Make the just-submitted card patch immediately available to the next
            // mutation. The backend read invalidation below remains the source of
            // truth, but no rapid sequential card save can rebuild from stale data.
            queryClient.setQueryData(['AGENCY', id], mergedAgencyData);
            return updateAgencyData(latestAgencyData, mergedAgencyData);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['AGENCY', id] });
            queryClient.invalidateQueries({ queryKey: ['AGENCIES'] });
            queryClient.invalidateQueries({ queryKey: ['AGENCY_POST_CODES', id] });

            if ((variables as Partial<AgencyData>)?.consultantIds?.length > 0) {
                queryClient.invalidateQueries({ queryKey: ['HAS_CONSULTANTS'] });
                queryClient.invalidateQueries({ queryKey: [TypeOfUser.Consultants.toUpperCase()] });
            }
        },
    });
};
