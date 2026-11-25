import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErstantwortPlatformTexts, putErstantwortPlatformTexts } from '../api/erstantwort/platformTexts';
import { ERSTANTWORT_DEFAULTS_QUERY_KEY } from './useErstantwortDefaults.hook';
import type { PlatformTextMap } from '../components/Tenants/AppSettings/ErstantwortSettings/PlatformGreeting/platformGreeting';

export const ERSTANTWORT_PLATFORM_QUERY_KEY = 'ERSTANTWORT_PLATFORM_TEXTS';

export const useErstantwortPlatformTexts = () =>
    useQuery({
        queryKey: [ERSTANTWORT_PLATFORM_QUERY_KEY],
        queryFn: getErstantwortPlatformTexts,
        retry: false,
    });

/** Saving also refreshes the defaults the Träger editors show, which now include these texts. */
export const useSaveErstantwortPlatformTexts = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (texts: PlatformTextMap) => putErstantwortPlatformTexts(texts),
        onSuccess: (data) => {
            queryClient.setQueryData([ERSTANTWORT_PLATFORM_QUERY_KEY], data);
            queryClient.invalidateQueries({ queryKey: [ERSTANTWORT_DEFAULTS_QUERY_KEY] });
        },
    });
};
