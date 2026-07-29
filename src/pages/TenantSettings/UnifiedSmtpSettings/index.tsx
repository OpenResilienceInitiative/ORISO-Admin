import { GlobalSmtpSettingsPage } from '../../GlobalSettings';
import { SmtpSettingsPage } from '../SmtpSettings';
import { BrandedEmailPreview } from '../../../components/EmailPreview/BrandedEmailPreview';
import { useTenantData } from '../../../hooks/useTenantData.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

export const UnifiedSmtpSettingsPage = () => {
    const { isSuperAdmin, tenantId } = useUserRoles();
    const { data } = useTenantData();
    // A super admin configures the PLATFORM SMTP, so their preview shows platform branding
    // (no tenant id); a tenant admin previews their own tenant's branding — same resolution
    // as SmtpSettingsPage.
    const resolvedTenantId = isSuperAdmin ? null : (tenantId && tenantId > 0 ? tenantId : data?.id) ?? null;

    return (
        <div className={styles.smtpSurface}>
            {isSuperAdmin ? <GlobalSmtpSettingsPage /> : <SmtpSettingsPage />}
            <BrandedEmailPreview tenantId={resolvedTenantId ?? undefined} />
        </div>
    );
};
