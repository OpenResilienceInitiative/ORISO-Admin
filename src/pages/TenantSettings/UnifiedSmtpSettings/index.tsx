import { GlobalSmtpSettingsPage } from '../../GlobalSettings';
import { SmtpSettingsPage } from '../SmtpSettings';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';

export const UnifiedSmtpSettingsPage = () => {
    const { isSuperAdmin } = useUserRoles();
    return isSuperAdmin ? <GlobalSmtpSettingsPage /> : <SmtpSettingsPage />;
};
