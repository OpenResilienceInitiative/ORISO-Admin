import merge from 'lodash.merge';
import { useMutation } from 'react-query';
import editTenantData from '../api/tenant/editTenantData';
import { TenantData } from '../types/tenant';
import { TENANT_DATA_KEY, useTenantData } from './useTenantData.hook';

export const useTenantDataMutation = () => {
    const { data: tenantData } = useTenantData();

    return useMutation(TENANT_DATA_KEY, (data: TenantData) => {
        return editTenantData(merge({}, tenantData, data));
    });
};
