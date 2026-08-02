import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS } from '../api/fetchData';
import { supportAccessRequestsEndpoint, supportTargetsSearchEndpoint } from '../appConfig';

export const SUPPORT_TARGETS_QUERY_KEY = 'SUPPORT_TARGETS';

/**
 * One entry per consultant-agency pair (ADR-018 §5). The same person appears once per assignment
 * because support is always requested for a consultant at one concrete agency, never for a
 * consultant as such.
 */
export interface SupportTarget {
    consultantId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    agencyId: number;
}

interface SupportTargetsResponse {
    content: SupportTarget[];
    totalElements: number;
}

interface SupportTargetsProps
    extends Omit<UseQueryOptions<{ data: SupportTarget[]; total: number }>, 'queryKey' | 'queryFn'> {
    search?: string;
    current?: number;
    pageSize?: number;
}

export const useSupportTargets = ({ search, current, pageSize, ...options }: SupportTargetsProps = {}) =>
    useQuery({
        queryKey: [SUPPORT_TARGETS_QUERY_KEY, search, current, pageSize],
        queryFn: async () => {
            const params = new URLSearchParams({
                query: search ?? '',
                page: String(current || 1),
                perPage: String(pageSize || 10),
            });
            const response = (await fetchData({
                url: `${supportTargetsSearchEndpoint}?${params.toString()}`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [],
            })) as SupportTargetsResponse;

            return { data: response.content ?? [], total: response.totalElements ?? 0 };
        },
        ...(options as object),
        retry: false,
        refetchOnWindowFocus: false,
    });

export interface SupportAccessRequest {
    consultantId: string;
    agencyId: number;
    password: string;
    otp: string;
}

export interface SupportAccessRequestResult {
    id: string;
    status: string;
    expiryDate: string;
    consultantId?: string;
    counterpartId?: string;
    agencyId?: number;
}

/**
 * Asks one consultant at one agency for support access. The credentials are sent once and never
 * kept: the caller drops them as soon as the request is away, so nothing lingers in component
 * state for the five minutes the consultant has to answer.
 */
export const useRequestSupportAccess = (
    options: UseMutationOptions<SupportAccessRequestResult, Error, SupportAccessRequest> = {},
) =>
    useMutation({
        mutationFn: (request) =>
            fetchData({
                url: supportAccessRequestsEndpoint,
                method: FETCH_METHODS.POST,
                skipAuth: false,
                bodyData: JSON.stringify({
                    consultantId: request.consultantId,
                    agencyId: request.agencyId,
                    password: request.password,
                    otp: request.otp,
                }),
                responseHandling: [
                    FETCH_SUCCESS.CONTENT,
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                    FETCH_ERRORS.CATCH_ALL,
                ],
            }) as Promise<SupportAccessRequestResult>,
        ...options,
    });
