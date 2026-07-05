import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTranslationKeys } from '../../../hooks/useTranslationKeys.hook';
import { useSetTranslationKey } from '../../../hooks/useSetTranslationKey.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import { TranslationApiKeysCard } from '../TranslationApiKeysCard';
import { TranslationProvider } from '../../../types/translation';

/**
 * Container for the machine-translation API keys card: loads the masked keys (only for
 * superadmins — the endpoint is superadmin-only) and wires the save-per-provider mutation.
 * For non-superadmins the card renders visible-but-disabled (never hidden, ORISO rule).
 */
export const TranslationApiKeysCardContainer = () => {
    const { t } = useTranslation();
    const { isSuperAdmin } = useUserRoles();
    const { data: keys, isLoading } = useTranslationKeys(isSuperAdmin);
    const { mutate, isPending, variables } = useSetTranslationKey();

    const handleSave = (provider: TranslationProvider, apiKey: string) =>
        mutate(
            { provider, apiKey },
            {
                onSuccess: () => message.success(t('legal.translation.settings.saved')),
                onError: () => message.error(t('legal.translation.settings.saveError')),
            },
        );

    return (
        <TranslationApiKeysCard
            keys={keys}
            isLoading={isSuperAdmin && isLoading}
            onSave={handleSave}
            savingProvider={isPending ? variables?.provider ?? null : null}
            disabled={!isSuperAdmin}
        />
    );
};

export default TranslationApiKeysCardContainer;
