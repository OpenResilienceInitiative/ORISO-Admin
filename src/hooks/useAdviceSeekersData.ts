import { useQuery } from '@tanstack/react-query';
import { getAdviceSeekers, type AdviceSeekerQuery } from '../api/adviceSeeker/adviceSeekers';

export const ADVICE_SEEKERS_QUERY_KEY = 'ADVICE_SEEKERS';

/** Advice seekers within the admin's reach (GET /useradmin/askers, ORISO-Admin#1521). */
export const useAdviceSeekersData = ({ enabled = true, ...query }: AdviceSeekerQuery & { enabled?: boolean }) =>
    useQuery({
        queryKey: [ADVICE_SEEKERS_QUERY_KEY, query.page, query.perPage, query.username, query.filters],
        queryFn: () => getAdviceSeekers(query),
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
    });
