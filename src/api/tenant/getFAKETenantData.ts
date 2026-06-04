import { CancelTokenSource } from 'axios';
import i18n from '../../i18n';

/**
 * retrieve all needed tenant data
 * @param tenantId {string}
 * @param cancelTokenSource {CancelTokenSource}
 * @return {Promise<AxiosResponse<any>>}
 */
const getTenantData = (tenantId: number, cancelTokenSource: CancelTokenSource) => {
    const tenantResponse = {
        id: tenantId,
        name: 'Onlineberatung',
        subdomain: 'onlineberatung',
        createDate: '2021-12-29T15:15:09',
        updateDate: '2021-12-29T15:15:09',
        licensing: {
            allowedNumberOfUsers: 3,
        },
        theming: {
            logo: null,
            favicon: null,
            primaryColor: '#ff2563',
            secondaryColor: '#c3e001',
        },
        content: {
            impressum: i18n.t('fakeTenant.imprint'),
            privacy: i18n.t('fakeTenant.privacy'),
            termsAndConditions: i18n.t('fakeTenant.termsAndConditions'),
            claim: i18n.t('fakeTenant.claim'),
        },
    };
    // eslint-disable-next-line no-console
    // console.log('FAKE get TenantData', tenantResponse, cancelTokenSource);
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(tenantResponse);
        }, 500);
    });
};

export default getTenantData;
