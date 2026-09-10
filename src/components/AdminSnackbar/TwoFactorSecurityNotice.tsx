import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearVisibleAdminSnackbar, showAdminSnackbar } from './adminSnackbar';

const NOTICE_KEY = 'two-factor-security-information';

/**
 * Informational reminder only. Authentication and authorization gates remain
 * owned by the server-side policy and never depend on this notification.
 */
export const TwoFactorSecurityNotice = ({ active, available }: { active?: boolean; available?: boolean }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setDismissed(false);
    }, [location.pathname]);

    useEffect(() => {
        if (active || !available || dismissed) {
            if (active) clearVisibleAdminSnackbar(NOTICE_KEY);
            return;
        }

        showAdminSnackbar({
            key: NOTICE_KEY,
            severity: 'error',
            persistent: true,
            message: `${t('twoFactorAuth.required.title')}: ${t('twoFactorAuth.required.subtitle')}`,
            onClose: () => setDismissed(true),
        });
    }, [active, available, dismissed, location.pathname, t]);

    return null;
};
