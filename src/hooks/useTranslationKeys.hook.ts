import { useQuery } from '@tanstack/react-query';
import { getTranslationKeys } from '../api/tenant/translation';

export const TRANSLATION_KEYS_KEY = 'translation-api-keys';

/**
 * Loads the masked machine-translation API keys per provider (superadmin only).
 * Pass enabled=false for non-superadmins so the disabled card never calls the endpoint.
 */
export const useTranslationKeys = (enabled = true) =>
    useQuery({
        queryKey: [TRANSLATION_KEYS_KEY],
        queryFn: getTranslationKeys,
        enabled,
        staleTime: 60_000,
    });
