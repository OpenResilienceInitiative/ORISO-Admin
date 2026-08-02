import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { globalSupportAdminsEndpoint } from '../appConfig';
import { CounselorData } from '../types/counselor';
import { GLOBAL_SUPPORT_ADMINS_QUERY_KEY } from './useGlobalSupportAdminsData';

/**
 * Blocking a Global Support Admin (ADR-018 §2) is not a cosmetic flag: the backend refuses new
 * handshakes immediately, marks running support sessions for revocation and only then withdraws the
 * Keycloak role — a token issued a minute ago stops working.
 */
const lifecycleMutation = (action: 'disable' | 'enable', options: UseMutationOptions<CounselorData, Error, string>) => {
    return {
        mutationFn: (adminId: string) =>
            fetchData({
                url: `${globalSupportAdminsEndpoint}/${adminId}/${action}`,
                method: FETCH_METHODS.POST,
                skipAuth: false,
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.CATCH_ALL,
                ],
            }) as Promise<CounselorData>,
        ...options,
    };
};

export const useDisableGlobalSupportAdmin = (options: UseMutationOptions<CounselorData, Error, string> = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        ...lifecycleMutation('disable', options),
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [GLOBAL_SUPPORT_ADMINS_QUERY_KEY] });
            options.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
};

export const useEnableGlobalSupportAdmin = (options: UseMutationOptions<CounselorData, Error, string> = {}) => {
    const queryClient = useQueryClient();

    return useMutation({
        ...lifecycleMutation('enable', options),
        onSuccess: (data, variables, onMutateResult, context) => {
            queryClient.invalidateQueries({ queryKey: [GLOBAL_SUPPORT_ADMINS_QUERY_KEY] });
            options.onSuccess?.(data, variables, onMutateResult, context);
        },
    });
};
