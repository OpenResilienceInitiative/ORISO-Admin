import { useMutation } from '@tanstack/react-query';
import { createDpaSignInvite } from '../api/tenant/createDpaSignInvite';

export const useCreateDpaInvite = (tenantId: number) =>
    useMutation({
        mutationFn: () => createDpaSignInvite(tenantId),
    });
