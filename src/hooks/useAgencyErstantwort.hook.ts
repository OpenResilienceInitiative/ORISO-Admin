import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAgencyErstantwort, putAgencyErstantwort } from '../api/erstantwort/agencyTexts';

export const AGENCY_ERSTANTWORT_QUERY_KEY = 'AGENCY_ERSTANTWORT';

export const useAgencyErstantwort = (agencyId: string | number) =>
    useQuery({
        queryKey: [AGENCY_ERSTANTWORT_QUERY_KEY, String(agencyId)],
        queryFn: () => getAgencyErstantwort(agencyId),
        enabled: agencyId != null && agencyId !== '' && agencyId !== 'add',
        retry: false,
    });

export const useSaveAgencyErstantwort = (agencyId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (content: Record<string, unknown>) => putAgencyErstantwort(agencyId, content),
        onSuccess: (data) => queryClient.setQueryData([AGENCY_ERSTANTWORT_QUERY_KEY, String(agencyId)], data),
    });
};
