import { useMutation, useQuery } from '@tanstack/react-query';
import {
    getServiceNoticeDraft,
    getServiceNoticePreview,
    saveServiceNoticeDraft,
    type ServiceNoticeDraftInput,
    type ServiceNoticeVariant,
} from '../api/serviceNotices/serviceNotices';

/** Only explicitly requested draft operations; language changes may read a saved preview. */
export const useServiceNoticeDraft = (reference: string | null, variant: ServiceNoticeVariant, enabled: boolean) => {
    const save = useMutation({
        mutationFn: ({ campaignKey, input }: { campaignKey: string; input: ServiceNoticeDraftInput }) =>
            saveServiceNoticeDraft(campaignKey, input),
        retry: false,
    });
    const open = useMutation({ mutationFn: getServiceNoticeDraft, retry: false });
    const preview = useQuery({
        queryKey: ['service-notice-preview', reference, variant],
        queryFn: ({ signal }) => {
            if (reference === null) throw new Error('No saved service-notice reference');
            return getServiceNoticePreview(reference, variant, signal);
        },
        enabled: enabled && reference !== null,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });
    return { save, open, preview };
};
