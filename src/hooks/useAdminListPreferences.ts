import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchData, FETCH_ERRORS, FETCH_METHODS } from '../api/fetchData';
import { adminListPreferencesEndpoint } from '../appConfig';
import { TypeOfUser } from '../enums/TypeOfUser';

export interface AdminListSort {
    field: string;
    order: 'ASC' | 'DESC';
}

interface AdminListPreferences {
    sorts: Partial<Record<string, AdminListSort>>;
}

const ADMIN_LIST_PREFERENCES_KEY = 'ADMIN_LIST_PREFERENCES';

// The server keys sorts by these tab names, which match the route segments.
const SORTABLE_TABS: readonly string[] = [
    TypeOfUser.Consultants,
    TypeOfUser.AgencyAdmins,
    TypeOfUser.TenantAdmins,
    TypeOfUser.PlatformAdmins,
];

export const hasSavedSort = (tab: string) => SORTABLE_TABS.includes(tab);

// Preferences are a convenience: no toast and no access-denied redirect when they fail.
const QUIET = [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT];

/** The caller's saved sort per users tab; `undefined` once settled means "use the default". */
export const useAdminListPreferences = ({ enabled = true }: { enabled?: boolean } = {}) =>
    useQuery<AdminListPreferences>({
        queryKey: [ADMIN_LIST_PREFERENCES_KEY],
        queryFn: () =>
            fetchData({
                url: adminListPreferencesEndpoint,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: QUIET,
            }),
        enabled,
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });

/** Saves a tab's sort in the background and keeps the cached preferences in step. */
export const useSaveAdminListSort = () => {
    const queryClient = useQueryClient();
    return useCallback(
        (tab: string, sort: AdminListSort) => {
            if (!hasSavedSort(tab)) return;
            queryClient.setQueryData<AdminListPreferences>([ADMIN_LIST_PREFERENCES_KEY], (current) => ({
                sorts: { ...current?.sorts, [tab]: sort },
            }));
            fetchData({
                url: `${adminListPreferencesEndpoint}/sorts/${tab}`,
                method: FETCH_METHODS.PUT,
                bodyData: JSON.stringify(sort),
                skipAuth: false,
                responseHandling: QUIET,
            }).catch(() => undefined);
        },
        [queryClient],
    );
};
