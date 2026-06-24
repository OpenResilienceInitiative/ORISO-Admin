import mergeWith from 'lodash.mergewith';
import { useMutation, useQueryClient } from 'react-query';
import addAgencyData from '../api/agency/addAgencyData';
import { updateAgencyData } from '../api/agency/updateAgencyData';
import { TypeOfUser } from '../enums/TypeOfUser';
import { AgencyData } from '../types/agency';
import { useAgencyData } from './useAgencyData';

export const useAgencyUpdate = (id: string) => {
    const queryClient = useQueryClient();
    const { data: agencyData } = useAgencyData({ id, enabled: id !== 'add' });
    return useMutation(
        (data: Partial<AgencyData>) => {
            if (id === 'add') {
                return addAgencyData(data);
            }
            return updateAgencyData(
                agencyData,
                mergeWith({ ...agencyData }, data, (objValue, srcValue) => {
                    return objValue instanceof Array ? srcValue : undefined;
                }),
            );
        },
        {
            onSuccess: (_data, variables) => {
                queryClient.invalidateQueries(['AGENCY', id]);
                queryClient.invalidateQueries(['AGENCIES']);
                queryClient.invalidateQueries(['AGENCY_POST_CODES', id]);

                if ((variables as Partial<AgencyData>)?.consultantIds?.length > 0) {
                    queryClient.invalidateQueries(['HAS_CONSULTANTS']);
                    queryClient.invalidateQueries([TypeOfUser.Consultants.toUpperCase()]);
                }
            },
        },
    );
};
