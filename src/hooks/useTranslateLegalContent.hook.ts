import { useMutation } from '@tanstack/react-query';
import { translateLegalTexts } from '../api/tenant/translation';
import { TranslateRequest, TranslateResponse } from '../types/translation';

/**
 * Machine-translates legal content (fieldKey -> HTML) via the tenant service.
 * Exposed as mutateAsync so the legal cards can await the result and merge the
 * translations (plus their `__meta` entries) into the language map themselves.
 */
export const useTranslateLegalContent = () => {
    const { mutateAsync, isPending } = useMutation<TranslateResponse, Error, TranslateRequest>({
        mutationFn: (request) => translateLegalTexts(request),
    });
    return { translate: mutateAsync, isTranslating: isPending };
};
