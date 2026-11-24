import { agencyDataAgencyId, agencyEndpointBase } from '../../appConfig';
import decodeHTML from '../../utils/decodeHTML';
import removeEmbedded from '../../utils/removeEmbedded';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

const PAGE_SIZE = 100;
const PAGE_LIMIT = 20;
const SILENT = [FETCH_ERRORS.NO_MATCH, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT];

export type AgencyNames = Record<number, string>;

const readPage = async (tenantId: number, page: number) => {
    const result = await fetchData({
        url: `${agencyEndpointBase}?q=*&page=${page}&perPage=${PAGE_SIZE}&field=NAME&order=ASC&tenantId=${tenantId}`,
        method: FETCH_METHODS.GET,
        responseHandling: SILENT,
    });
    const { data, total } = removeEmbedded(result ?? {});
    return { rows: (data ?? []) as Array<{ id?: number | string; name?: string }>, total: Number(total) || 0 };
};

/** Names of every agency of one Träger, deleted ones included, so overrides of old agencies stay named. */
export const fetchTenantAgencyNames = async (tenantId: number): Promise<AgencyNames> => {
    const names: AgencyNames = {};
    let seen = 0;
    for (let page = 1; page <= PAGE_LIMIT; page += 1) {
        // eslint-disable-next-line no-await-in-loop -- the total is known only after the first page
        const { rows, total } = await readPage(tenantId, page);
        rows.forEach((row) => {
            if (row.id != null && row.name) {
                names[Number(row.id)] = decodeHTML(row.name);
            }
        });
        seen += rows.length;
        if (rows.length === 0 || seen >= total) {
            break;
        }
    }
    return names;
};

export const fetchAgencyName = async (agencyId: number): Promise<string | null> => {
    const result = await fetchData({
        url: agencyDataAgencyId(String(agencyId)),
        method: FETCH_METHODS.GET,
        responseHandling: SILENT,
    });
    // eslint-disable-next-line no-underscore-dangle
    const name = (result?._embedded ?? result)?.name;
    return typeof name === 'string' && name ? decodeHTML(name) : null;
};
