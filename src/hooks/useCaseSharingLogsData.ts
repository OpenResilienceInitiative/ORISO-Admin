import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { withUtcInstants } from '../utils/backendInstant';
import { caseSharingChangesEndpoint } from '../appConfig';
import { CaseSharingChangesResponse } from '../types/caseSharingLogs';

interface CaseSharingLogsDataProps extends Omit<UseQueryOptions<CaseSharingChangesResponse>, 'queryKey' | 'queryFn'> {
    /** 1-based, like every admin table; the AgencyService counts pages from 0. */
    page: number;
    perPage: number;
    agencyId?: number | string;
}

export const caseSharingLogsUrl = ({
    page,
    perPage,
    agencyId,
}: Pick<CaseSharingLogsDataProps, 'page' | 'perPage' | 'agencyId'>) => {
    const params = new URLSearchParams();
    const trimmedAgencyId = agencyId == null ? '' : String(agencyId).trim();
    if (trimmedAgencyId) {
        params.set('agencyId', trimmedAgencyId);
    }
    params.set('page', String(Math.max(page, 1) - 1));
    params.set('perPage', String(Math.min(Math.max(perPage, 1), 100)));
    return `${caseSharingChangesEndpoint}?${params.toString()}`;
};

/** Never undefined lists: an empty or partial body reads as "no changes yet". */
export const toCaseSharingChanges = (body: Partial<CaseSharingChangesResponse> | null | undefined) => {
    const entries = Array.isArray(body?.entries) ? body.entries : [];
    return { entries, total: typeof body?.total === 'number' ? body.total : entries.length };
};

export const useCaseSharingLogsData = ({ page, perPage, agencyId, ...options }: CaseSharingLogsDataProps) =>
    useQuery({
        queryKey: ['CASE_SHARING_LOGS', page, perPage, agencyId ?? ''],
        queryFn: () =>
            fetchData({
                url: caseSharingLogsUrl({ page, perPage, agencyId }),
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.FORBIDDEN],
            })
                .then(withUtcInstants)
                .then(toCaseSharingChanges),
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });
