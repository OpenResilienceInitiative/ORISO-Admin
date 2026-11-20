import { useTranslation } from 'react-i18next';
import { getCounsellingAppUrl } from './counsellingAppUrl';
import { HintText } from '../../../components/HintText';

/**
 * Shown above the password form for accounts that also counsel. The counselling app seals the chat
 * recovery key under the login password; a change made here does not re-seal it, so the person is
 * pointed to the better place. Informational only — the change is never blocked.
 */
export const PasswordChangeCounsellorNotice = ({
    counsellingAppUrl = getCounsellingAppUrl(),
}: {
    counsellingAppUrl?: string | null;
}) => {
    const { t } = useTranslation();
    return (
        <HintText title={t('profile.passwordChange.counsellorNotice')} className="mb-m">
            {counsellingAppUrl ? (
                <a href={counsellingAppUrl} target="_blank" rel="noopener noreferrer">
                    {t('profile.passwordChange.counsellorNotice.link')}
                </a>
            ) : undefined}
        </HintText>
    );
};
