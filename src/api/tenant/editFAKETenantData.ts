import { TenantData } from '../../types/tenant';

/**
 * retrieve all needed tenant data
 * @param tenantData
 * @return data
 */
const editFAKETenantData = (tenantData: TenantData) => {
    const tenantResponse = tenantData;

    // eslint-disable-next-line no-console
    console.log('FAKE edit TenantData', tenantResponse);

    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(tenantResponse);
        }, 1000);
    });
};

export default editFAKETenantData;
