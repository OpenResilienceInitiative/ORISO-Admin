import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useRef } from 'react';
import { useAdminFeedback } from './useAdminFeedback';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { getSingleTenantData } from '../api/tenant/getSingleTenantData';
import { tenantAdminEndpoint } from '../appConfig';
import { TenantAdminData } from '../types/TenantAdminData';
import { mergeTenantAdminData, serializeTenantAdminDataUpdate } from '../utils/mergeTenantAdminData';
import { useSingleTenantData, TENANT_QUERY_KEY } from './useSingleTenantData';
import { TENANT_ADMIN_DATA_KEY } from './useTenantAdminData.hook';
import { PUBLIC_TENANT_DATA_KEY } from './usePublicTenantData.hook';
import { TENANT_DATA_KEY } from './useTenantData.hook';

import { UnconfirmedFormSaveError } from '../utils/UnconfirmedFormSaveError';

interface TenantAdminDataOptions
    extends UseMutationOptions<Partial<TenantAdminData>, unknown, Partial<TenantAdminData>> {
    id: string | number;
    /** `null` suppresses the success toast for callers that confirm the outcome themselves. */
    successMessageKey?: string | null;
    /** Skip the GET /service/tenantadmin/{id} prefetch; the PUT itself always reads the tenant fresh. */
    seedTenantAdminData?: TenantAdminData;
    prefetchTenantAdminData?: boolean;
}

export const useTenantAdminDataMutation = ({
    id,
    successMessageKey = 'message.success.setting.update',
    seedTenantAdminData,
    prefetchTenantAdminData = true,
    ...options
}: TenantAdminDataOptions) => {
    const { notification } = useAdminFeedback();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const shouldPrefetchTenantAdminData =
        prefetchTenantAdminData && id !== null && id !== undefined && id !== '' && id !== 'add' && !seedTenantAdminData;
    const { data: tenantAdminData } = useSingleTenantData({
        id,
        enabled: shouldPrefetchTenantAdminData,
    });

    // The base each PUT was built on, keyed by that mutation's variables, so overlapping saves
    // merge the cache onto their own read and never onto a later one.
    const writtenBasesRef = useRef(new WeakMap<Partial<TenantAdminData>, TenantAdminData>());

    return useMutation({
        mutationFn: async (data: Partial<TenantAdminData>) => {
            // TenantService replaces every tenant field on PUT. A cached or /service/tenant-seeded base
            // lacks fields (Erstantwort texts, other `claim` languages), and a PUT built on it wipes
            // them (#1066). So every write rests on a fresh, full read; if that fails, nothing is written.
            const mergeBase = await getSingleTenantData(id, { silent: true });
            // getSingleTenantData always adds `name`; only a real tenant has an id.
            if (mergeBase?.id == null) {
                throw new Error('TENANT_READ_FAILED');
            }
            writtenBasesRef.current.set(data, mergeBase);

            return fetchData({
                url: `${tenantAdminEndpoint}/${id}`,
                method: FETCH_METHODS.PUT,
                skipAuth: false,
                bodyData: serializeTenantAdminDataUpdate(mergeBase, data),
                responseHandling: [FETCH_ERRORS.BAD_GATEWAY_WITH_RESPONSE],
            }).catch((error: unknown) => {
                // Only this PUT can report an uncertain save. A failed preflight GET wrote nothing.
                if (error instanceof Response && error.status === 502) {
                    if (error.headers.get(FETCH_ERRORS.X_REASON) === 'CONSULTING_SETTINGS_OUTCOME_UNKNOWN') {
                        throw new UnconfirmedFormSaveError('Tenant settings save could not be confirmed', {
                            cause: error,
                        });
                    }
                    throw new Error(`API call error: ${error.status} ${error.statusText}`);
                }
                throw error;
            });
        },
        ...options,
        onSuccess: (responseData, updatedData, onMutateResult, context) => {
            const mergeBase = writtenBasesRef.current.get(updatedData) ?? tenantAdminData ?? seedTenantAdminData;
            writtenBasesRef.current.delete(updatedData);
            const merged = mergeTenantAdminData(mergeBase, updatedData);
            queryClient.setQueryData([TENANT_ADMIN_DATA_KEY], merged);
            if (id != null && id !== '' && id !== 'add') {
                queryClient.setQueryData([TENANT_QUERY_KEY, Number(id)], merged);
            }
            // Appearance cards may seed from /service/tenant — refresh that cache after PUT.
            queryClient.invalidateQueries({ queryKey: [TENANT_DATA_KEY] });
            queryClient.invalidateQueries({ queryKey: [PUBLIC_TENANT_DATA_KEY, 'id', String(id)] });
            if (successMessageKey !== null) {
                notification.success({
                    message: t(successMessageKey),
                    duration: 3,
                });
            }
            options?.onSuccess?.(responseData, updatedData, onMutateResult, context);
        },
        onError: async (error, updatedData, onMutateResult, context) => {
            const mergeBase = writtenBasesRef.current.get(updatedData);
            writtenBasesRef.current.delete(updatedData);
            notification.error({
                message: t(
                    error instanceof UnconfirmedFormSaveError
                        ? 'message.error.tenantSettingsOutcomeUnknown'
                        : 'message.error.default',
                ),
            });
            if (error instanceof UnconfirmedFormSaveError) {
                const tenantKey = [TENANT_QUERY_KEY, Number(id)];
                const previousVersion = queryClient.getQueryState(tenantKey)?.dataUpdateCount;
                try {
                    const current: TenantAdminData = await getSingleTenantData(id, { keepPageOnError: true });
                    if (
                        String(current?.id) === String(id) &&
                        current.settings &&
                        (!mergeBase?.settings?.extendedSettings || current.settings.extendedSettings) &&
                        queryClient.getQueryState(tenantKey)?.dataUpdateCount === previousVersion
                    ) {
                        error.recordCurrentValues({ ...current });
                        queryClient.setQueryData(tenantKey, current);
                    }
                } catch {
                    // The write still failed. A second error would obscure the save outcome.
                }
            }
            options?.onError?.(error, updatedData, onMutateResult, context);
        },
    });
};
