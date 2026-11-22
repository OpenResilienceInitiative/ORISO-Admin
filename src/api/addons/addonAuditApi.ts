import { addonServiceEndpoint } from '../../appConfig';
import type { AddonAuditPage, AddonAuditQuery } from '../../addons/addonTypes';
import { withUtcInstants } from '../../utils/backendInstant';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { queryString } from './addonsApi';

const toNumber = (value: unknown, fallback: number) => (typeof value === 'number' ? value : fallback);

export const getAddonAuditEntries = ({
    tenantId,
    addon,
    from,
    to,
    page,
    size,
}: AddonAuditQuery): Promise<AddonAuditPage> =>
    fetchData({
        url: `${addonServiceEndpoint}/admin/audit${queryString({ tenantId, addon, from, to, page, size })}`,
        method: FETCH_METHODS.GET,
        responseHandling: [FETCH_ERRORS.FORBIDDEN, FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.CATCH_ALL_SILENT],
    }).then((result) => ({
        items: Array.isArray(result?.items) ? withUtcInstants(result.items) : [],
        page: toNumber(result?.page, page),
        size: toNumber(result?.size, size),
        total: toNumber(result?.total, 0),
    }));
