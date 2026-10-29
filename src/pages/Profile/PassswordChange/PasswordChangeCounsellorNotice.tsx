import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { getCounsellingAppUrl } from './counsellingAppUrl';

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
        <Alert
            type="info"
            showIcon
            className="mb-m"
            message={t('profile.passwordChange.counsellorNotice')}
            description={
                counsellingAppUrl ? (
                    <a href={counsellingAppUrl} target="_blank" rel="noopener noreferrer">
                        {t('profile.passwordChange.counsellorNotice.link')}
                    </a>
                ) : undefined
            }
        />
    );
};
