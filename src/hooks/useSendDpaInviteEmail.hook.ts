import { useMutation } from '@tanstack/react-query';
import { sendDpaInviteEmail } from '../api/tenant/sendDpaInviteEmail';

export const useSendDpaInviteEmail = () =>
    useMutation({
        mutationFn: sendDpaInviteEmail,
    });
