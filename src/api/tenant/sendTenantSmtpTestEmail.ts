import { tenantEndpoint } from '../../appConfig';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../fetchData';

export const sendTenantSmtpTestEmail = (tenantId: string) =>
    fetchData({
        url: `${tenantEndpoint}${encodeURIComponent(tenantId)}/smtp-test-deliveries`,
        method: FETCH_METHODS.POST,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });
