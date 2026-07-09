import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setTranslationKey } from '../api/tenant/translation';
import { TranslationProvider } from '../types/translation';
import { TRANSLATION_KEYS_KEY } from './useTranslationKeys.hook';

interface SetTranslationKeyVariables {
    provider: TranslationProvider;
    apiKey: string;
}

/** Stores one provider's machine-translation API key and refreshes the masked key list. */
export const useSetTranslationKey = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ provider, apiKey }: SetTranslationKeyVariables) => setTranslationKey(provider, apiKey),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [TRANSLATION_KEYS_KEY] }),
    });
};
