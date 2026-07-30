import { useQuery } from '@tanstack/react-query';
import {
    getInviteEmailPreview,
    type InviteEmailPreviewDTO,
    type InviteEmailPreviewParams,
} from '../api/accountInvites/accountInvites';

export const INVITE_EMAIL_PREVIEW_KEY = 'invite-email-preview';

/**
 * Loads the branded invite mail exactly as the dispatcher renders it (ORISO-UserService#914).
 *
 * The endpoint is a pure render — no state changes, no mail is sent — so the result is cached for
 * a minute and not refetched on window focus. Errors surface to the caller (the preview panel
 * shows an inline error with a retry) instead of the global toast.
 */
export const useInviteEmailPreview = (params: InviteEmailPreviewParams = {}, enabled = true) =>
    useQuery<InviteEmailPreviewDTO>({
        queryKey: [
            INVITE_EMAIL_PREVIEW_KEY,
            params.templateId ?? null,
            params.kind ?? null,
            params.tenantId ?? null,
            params.language ?? null,
        ],
        queryFn: () => getInviteEmailPreview(params),
        enabled,
        retry: false,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
    });
