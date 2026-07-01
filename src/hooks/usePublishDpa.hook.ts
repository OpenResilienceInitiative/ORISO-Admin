import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishDpa } from '../api/tenant/publishDpa';
import { DPA_VERSIONS_KEY } from './useDpaVersions.hook';

/** Publishes the tenant DPA and refreshes the version list on success. */
export const usePublishDpa = (tenantId: number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (contentByLanguage: Record<string, string>) => publishDpa(tenantId, contentByLanguage),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [DPA_VERSIONS_KEY, tenantId] }),
    });
};
