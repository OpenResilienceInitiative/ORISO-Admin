import { useMutation } from '@tanstack/react-query';
import { confirmServiceNotice, dryRunServiceNotice } from '../api/serviceNotices/serviceNotices';

/** Both steps run only on an explicit click and are never retried automatically. */
export const useServiceNoticeSend = () => {
    const count = useMutation({ mutationFn: dryRunServiceNotice, retry: false });
    const confirm = useMutation({
        mutationFn: ({ campaignKey, expectedRecipients }: { campaignKey: string; expectedRecipients: number }) =>
            confirmServiceNotice(campaignKey, expectedRecipients),
        retry: false,
    });
    return { count, confirm };
};
